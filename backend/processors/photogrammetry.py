"""Local multi-view photogrammetry pipeline.

This module intentionally shells out to battle-tested tools instead of trying to
reimplement SfM/MVS logic in Python. The Docker image installs the CLIs.
"""

from __future__ import annotations

import asyncio
import json
import os
import shlex
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from typing_extensions import TypeAlias

import cv2
import numpy as np
from PIL import Image

ArtifactMap: TypeAlias = dict[str, Path]
UpdateJob: TypeAlias = Callable[..., None]


@dataclass(frozen=True)
class PipelineConfig:
    job_dir: Path
    min_frames: int
    max_frames: int
    image_max_size: int
    splat_method: str
    nerfstudio_extra_args: list[str]
    enable_splat: bool
    enable_mesh: bool
    enable_openmvs: bool

    @classmethod
    def from_env(cls, job_dir: Path) -> "PipelineConfig":
        return cls(
            job_dir=job_dir,
            min_frames=int(os.getenv("ARVIEW_MIN_FRAMES", "24")),
            max_frames=int(os.getenv("ARVIEW_MAX_FRAMES", "160")),
            image_max_size=int(os.getenv("ARVIEW_IMAGE_MAX_SIZE", "1800")),
            splat_method=os.getenv("ARVIEW_SPLAT_METHOD", "splatfacto-big"),
            nerfstudio_extra_args=shlex.split(os.getenv("ARVIEW_NERFSTUDIO_EXTRA_ARGS", "")),
            enable_splat=os.getenv("ARVIEW_ENABLE_SPLAT", "1") != "0",
            enable_mesh=os.getenv("ARVIEW_ENABLE_MESH", "1") != "0",
            enable_openmvs=os.getenv("ARVIEW_ENABLE_OPENMVS", "1") != "0",
        )


def _job_log(config: PipelineConfig) -> Path:
    log_path = config.job_dir / "pipeline.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    return log_path


async def _run(
    cmd: list[str],
    *,
    cwd: Path,
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
    progress: int,
    message: str,
    env: dict[str, str] | None = None,
) -> None:
    update_job(job_id, status="processing", progress=progress, message=message)
    log_path = _job_log(config)
    with log_path.open("a", encoding="utf-8") as log:
        log.write(f"\n$ {' '.join(shlex.quote(part) for part in cmd)}\n")
        log.flush()

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={**os.environ, **(env or {})},
        )

        assert process.stdout is not None
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace")
            log.write(text)
            log.flush()

        returncode = await process.wait()
        if returncode != 0:
            raise RuntimeError(f"{message} a echoue. Consulte {log_path}")


def _sharpness(path: Path) -> float:
    image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        return 0.0
    return float(cv2.Laplacian(image, cv2.CV_64F).var())


def _cover_crop_box(image_size: tuple[int, int], capture: dict[str, Any]) -> tuple[int, int, int, int] | None:
    box = capture.get("box")
    viewport = capture.get("viewport")
    if not isinstance(box, dict) or not isinstance(viewport, dict):
        return None

    iw, ih = image_size
    vw = float(viewport.get("width") or 0)
    vh = float(viewport.get("height") or 0)
    if iw <= 0 or ih <= 0 or vw <= 0 or vh <= 0:
        return None

    scale = max(vw / iw, vh / ih)
    rendered_w = iw * scale
    rendered_h = ih * scale
    offset_x = (rendered_w - vw) / 2
    offset_y = (rendered_h - vh) / 2

    x = float(box.get("x", 0)) / 100 * vw
    y = float(box.get("y", 0)) / 100 * vh
    w = float(box.get("w", 100)) / 100 * vw
    h = float(box.get("h", 100)) / 100 * vh

    pad = 0.12
    x -= w * pad
    y -= h * pad
    w *= 1 + pad * 2
    h *= 1 + pad * 2

    left = max(0, int((x + offset_x) / scale))
    top = max(0, int((y + offset_y) / scale))
    right = min(iw, int((x + w + offset_x) / scale))
    bottom = min(ih, int((y + h + offset_y) / scale))

    if right - left < iw * 0.2 or bottom - top < ih * 0.2:
        return None
    return left, top, right, bottom


def _prepare_single_image(src: Path, dst: Path, capture: dict[str, Any], max_size: int) -> None:
    with Image.open(src) as image:
        image = image.convert("RGB")
        crop_box = _cover_crop_box(image.size, capture)
        if crop_box:
            image = image.crop(crop_box)
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        image.save(dst, "JPEG", quality=94, optimize=True)


def prepare_images(input_dir: Path, capture: dict[str, Any], config: PipelineConfig) -> Path:
    raw_paths = sorted(
        [p for p in input_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]
    )
    if len(raw_paths) < config.min_frames:
        raise RuntimeError(f"Capture trop courte: {len(raw_paths)} images, minimum {config.min_frames}")

    scored = sorted(((path, _sharpness(path)) for path in raw_paths), key=lambda item: item[1], reverse=True)
    selected = sorted(path for path, _score in scored[: config.max_frames])

    prepared = config.job_dir / "dataset" / "images"
    if prepared.exists():
        shutil.rmtree(prepared)
    prepared.mkdir(parents=True, exist_ok=True)

    for index, src in enumerate(selected):
        _prepare_single_image(src, prepared / f"frame_{index:04d}.jpg", capture, config.image_max_size)

    manifest = {
        "raw_frames": len(raw_paths),
        "selected_frames": len(selected),
        "capture": capture,
    }
    (config.job_dir / "dataset" / "capture.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return prepared


async def process_nerfstudio_data(
    images_dir: Path,
    *,
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
) -> Path:
    processed = config.job_dir / "nerfstudio-data"
    await _run(
        ["ns-process-data", "images", "--data", str(images_dir), "--output-dir", str(processed)],
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=28,
        message="Finding camera poses",
    )

    transforms = processed / "transforms.json"
    if not transforms.exists():
        raise RuntimeError("Nerfstudio/COLMAP n'a pas produit transforms.json")
    return processed


async def train_gaussian_splat(
    processed: Path,
    *,
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
) -> Path | None:
    if not config.enable_splat:
        return None

    runs_dir = config.job_dir / "nerfstudio-runs"
    cmd = [
        "ns-train",
        config.splat_method,
        "--data",
        str(processed),
        "--output-dir",
        str(runs_dir),
        *config.nerfstudio_extra_args,
    ]
    await _run(
        cmd,
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=55,
        message="Training Gaussian Splat",
    )

    configs = sorted(runs_dir.rglob("config.yml"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not configs:
        raise RuntimeError("Aucun config.yml Nerfstudio trouve apres entrainement")

    export_dir = config.job_dir / "exports" / "splat"
    await _run(
        ["ns-export", "gaussian-splat", "--load-config", str(configs[0]), "--output-dir", str(export_dir)],
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=78,
        message="Optimizing",
    )

    splats = sorted(export_dir.rglob("*.ply"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not splats:
        raise RuntimeError("Export Gaussian Splat termine, mais aucun .ply trouve")
    return splats[0]


def _find_sparse_model(processed: Path) -> Path:
    candidates = [
        processed / "colmap" / "sparse" / "0",
        processed / "colmap" / "sparse",
        processed / "sparse" / "0",
    ]
    for candidate in candidates:
        if candidate.exists() and any(candidate.glob("*.bin")):
            return candidate
    matches = [p for p in processed.rglob("sparse") if p.is_dir()]
    for sparse in matches:
        for child in [sparse / "0", sparse]:
            if child.exists() and any(child.glob("*.bin")):
                return child
    raise RuntimeError("Modele sparse COLMAP introuvable")


async def build_colmap_mesh(
    images_dir: Path,
    processed: Path,
    *,
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
) -> Path | None:
    if not config.enable_mesh:
        return None

    sparse = _find_sparse_model(processed)
    dense = config.job_dir / "colmap-dense"
    dense.mkdir(parents=True, exist_ok=True)

    await _run(
        [
            "colmap",
            "image_undistorter",
            "--image_path",
            str(images_dir),
            "--input_path",
            str(sparse),
            "--output_path",
            str(dense),
            "--output_type",
            "COLMAP",
            "--max_image_size",
            str(config.image_max_size),
        ],
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=82,
        message="Building point cloud",
    )

    await _run(
        [
            "colmap",
            "patch_match_stereo",
            "--workspace_path",
            str(dense),
            "--workspace_format",
            "COLMAP",
            "--PatchMatchStereo.geom_consistency",
            "true",
        ],
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=86,
        message="Generating Mesh",
    )

    fused = dense / "fused.ply"
    await _run(
        [
            "colmap",
            "stereo_fusion",
            "--workspace_path",
            str(dense),
            "--workspace_format",
            "COLMAP",
            "--input_type",
            "geometric",
            "--output_path",
            str(fused),
        ],
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=90,
        message="Generating Mesh",
    )

    mesh = dense / "meshed-poisson.ply"
    await _run(
        ["colmap", "poisson_mesher", "--input_path", str(fused), "--output_path", str(mesh)],
        cwd=config.job_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=92,
        message="Generating Mesh",
    )

    return mesh if mesh.exists() else fused


async def build_openmvs_mesh(
    dense_colmap_dir: Path,
    *,
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
) -> Path | None:
    required = ["InterfaceCOLMAP", "DensifyPointCloud", "ReconstructMesh", "TextureMesh"]
    if not config.enable_openmvs or any(shutil.which(binary) is None for binary in required):
        return None

    mvs_dir = config.job_dir / "openmvs"
    mvs_dir.mkdir(parents=True, exist_ok=True)
    scene = mvs_dir / "scene.mvs"

    await _run(
        [
            "InterfaceCOLMAP",
            "-i",
            str(dense_colmap_dir),
            "-o",
            str(scene),
            "--image-folder",
            str(dense_colmap_dir / "images"),
            "-w",
            str(mvs_dir),
        ],
        cwd=mvs_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=93,
        message="Generating Mesh",
    )

    await _run(
        ["DensifyPointCloud", str(scene), "--resolution-level", "1", "--number-views", "8", "-w", str(mvs_dir)],
        cwd=mvs_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=94,
        message="Generating Mesh",
    )

    dense_scene = mvs_dir / "scene_dense.mvs"
    await _run(
        ["ReconstructMesh", str(dense_scene if dense_scene.exists() else scene), "-w", str(mvs_dir)],
        cwd=mvs_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=95,
        message="Generating Mesh",
    )

    mesh_scene = mvs_dir / "scene_dense_mesh.mvs"
    mesh_ply = mvs_dir / "scene_dense_mesh.ply"
    await _run(
        ["TextureMesh", str(mesh_scene if mesh_scene.exists() else scene), "-m", str(mesh_ply), "-w", str(mvs_dir)],
        cwd=mvs_dir,
        job_id=job_id,
        update_job=update_job,
        config=config,
        progress=96,
        message="Optimizing",
    )

    outputs = sorted(
        [*mvs_dir.glob("*.obj"), *mvs_dir.glob("*texture*.ply"), *mvs_dir.glob("*mesh*.ply")],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return outputs[0] if outputs else None


async def export_glb(
    mesh: Path,
    *,
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
) -> Path:
    out_dir = config.job_dir / "exports" / "model"
    out_dir.mkdir(parents=True, exist_ok=True)
    glb = out_dir / "model.glb"

    blender = shutil.which("blender")
    if blender:
        script = config.job_dir / "export_glb.py"
        script.write_text(
            "\n".join(
                [
                    "import bpy, sys",
                    "from pathlib import Path",
                    "mesh = Path(sys.argv[-2])",
                    "out = Path(sys.argv[-1])",
                    "bpy.ops.object.select_all(action='SELECT')",
                    "bpy.ops.object.delete()",
                    "if mesh.suffix.lower() == '.obj':",
                    "    bpy.ops.wm.obj_import(filepath=str(mesh))",
                    "else:",
                    "    bpy.ops.wm.ply_import(filepath=str(mesh))",
                    "bpy.ops.object.select_all(action='SELECT')",
                    "bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB')",
                ]
            ),
            encoding="utf-8",
        )
        await _run(
            [blender, "--background", "--python", str(script), "--", str(mesh), str(glb)],
            cwd=config.job_dir,
            job_id=job_id,
            update_job=update_job,
            config=config,
            progress=98,
            message="Optimizing",
        )
        return glb

    update_job(job_id, status="processing", progress=98, message="Optimizing")
    try:
        import trimesh

        scene = trimesh.load(str(mesh), force="scene")
        scene.export(str(glb))
        return glb
    except Exception as exc:
        raise RuntimeError("Impossible d'exporter GLB: installe Blender ou trimesh") from exc


async def process_multiview_capture(
    *,
    input_dir: Path,
    capture: dict[str, Any],
    job_id: str,
    update_job: UpdateJob,
    config: PipelineConfig,
) -> ArtifactMap:
    update_job(job_id, status="processing", progress=8, message="Preparing images")
    images_dir = await asyncio.to_thread(prepare_images, input_dir, capture, config)

    processed = await process_nerfstudio_data(images_dir, job_id=job_id, update_job=update_job, config=config)

    artifacts: ArtifactMap = {"log": _job_log(config)}
    splat = await train_gaussian_splat(processed, job_id=job_id, update_job=update_job, config=config)
    if splat:
        artifacts["splat"] = splat

    mesh = await build_colmap_mesh(images_dir, processed, job_id=job_id, update_job=update_job, config=config)
    dense_dir = config.job_dir / "colmap-dense"
    openmvs_mesh = None
    if mesh and dense_dir.exists():
        openmvs_mesh = await build_openmvs_mesh(dense_dir, job_id=job_id, update_job=update_job, config=config)
    final_mesh = openmvs_mesh or mesh
    if final_mesh:
        artifacts["mesh"] = final_mesh
        artifacts["glb"] = await export_glb(final_mesh, job_id=job_id, update_job=update_job, config=config)

    if "glb" not in artifacts and "splat" not in artifacts:
        raise RuntimeError("Aucun artifact 3D exploitable n'a ete produit")

    return artifacts
