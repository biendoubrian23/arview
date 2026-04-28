"""ARView local reconstruction backend.

The backend receives guided multi-view captures from the Next.js app and runs a
local GPU photogrammetry pipeline:

1. frame preparation and sharpness filtering
2. COLMAP camera reconstruction via nerfstudio's ns-process-data
3. Gaussian Splat training/export with nerfstudio splatfacto
4. optional OpenMVS/COLMAP mesh export to GLB for web AR
"""

from __future__ import annotations

import json
import os
import tempfile
import uuid
from pathlib import Path
from shutil import which
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from processors.photogrammetry import ArtifactMap, PipelineConfig, process_multiview_capture

load_dotenv()

WORK_DIR = Path(os.getenv("ARVIEW_WORK_DIR", Path(tempfile.gettempdir()) / "arview_backend"))
WORK_DIR.mkdir(parents=True, exist_ok=True)

jobs: dict[str, dict[str, Any]] = {}

app = FastAPI(title="ARView GPU Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def update_job(job_id: str, **kwargs: Any) -> None:
    jobs.setdefault(job_id, {}).update(kwargs)


def parse_capture(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"capture JSON invalide: {exc}") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="capture doit etre un objet JSON")
    return data


async def save_frames(job_id: str, files: list[UploadFile]) -> Path:
    input_dir = WORK_DIR / job_id / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    for index, image in enumerate(files):
        content_type = image.content_type or ""
        if "image" not in content_type:
            raise HTTPException(status_code=400, detail=f"Fichier non image: {image.filename}")
        ext = ".jpg" if "jpeg" in content_type or "jpg" in content_type else ".png"
        frame_path = input_dir / f"frame_{index:04d}{ext}"
        frame_path.write_bytes(await image.read())

    return input_dir


async def run_pipeline(job_id: str, input_dir: Path, capture: dict[str, Any]) -> None:
    try:
        config = PipelineConfig.from_env(WORK_DIR / job_id)
        artifacts = await process_multiview_capture(
            input_dir=input_dir,
            capture=capture,
            job_id=job_id,
            update_job=update_job,
            config=config,
        )
        update_job(
            job_id,
            status="done",
            progress=100,
            message="Modele 3D pret",
            artifacts={key: str(value) for key, value in artifacts.items()},
        )
    except Exception as exc:
        update_job(job_id, status="error", progress=0, message=str(exc))


@app.post("/scan/start")
async def start_scan(
    background_tasks: BackgroundTasks,
    images: list[UploadFile] = File(...),
    capture: Optional[str] = Form(default=None),
):
    if len(images) < int(os.getenv("ARVIEW_MIN_FRAMES", "24")):
        raise HTTPException(
            status_code=400,
            detail=f"Pas assez de frames: {len(images)}. Capture au moins 24 images nettes.",
        )

    job_id = str(uuid.uuid4())
    capture_data = parse_capture(capture)
    input_dir = await save_frames(job_id, images)

    update_job(
        job_id,
        status="queued",
        progress=0,
        message=f"{len(images)} images recues",
        artifacts={},
    )
    background_tasks.add_task(run_pipeline, job_id, input_dir, capture_data)
    return {"job_id": job_id, "mode": "local-gpu-photogrammetry", "frames_received": len(images)}


@app.get("/scan/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return job


@app.get("/scan/result/{job_id}")
async def get_default_result(job_id: str):
    return await get_result(job_id, "glb")


@app.get("/scan/result/{job_id}/{artifact}")
async def get_result(job_id: str, artifact: str):
    job = jobs.get(job_id)
    if not job or job.get("status") != "done":
        raise HTTPException(status_code=404, detail="Resultat non disponible")

    artifacts: ArtifactMap = job.get("artifacts") or {}
    path_str = artifacts.get(artifact)
    if not path_str:
        raise HTTPException(status_code=404, detail=f"Artifact non disponible: {artifact}")

    path = Path(path_str)
    if not path.exists():
        raise HTTPException(status_code=410, detail="Fichier expire, relancer un scan")

    media_types = {
        "glb": "model/gltf-binary",
        "splat": "application/octet-stream",
        "pointcloud": "application/octet-stream",
        "mesh": "application/octet-stream",
        "log": "text/plain",
    }
    return FileResponse(path=path, media_type=media_types.get(artifact, "application/octet-stream"), filename=path.name)


@app.get("/health")
async def health():
    cuda = False
    gpu_name = None
    torch_version = None
    try:
        import torch

        torch_version = torch.__version__
        cuda = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda else None
    except Exception:
        pass

    tools = {
        "colmap": bool(which("colmap")),
        "ns-process-data": bool(which("ns-process-data")),
        "ns-train": bool(which("ns-train")),
        "ns-export": bool(which("ns-export")),
        "InterfaceCOLMAP": bool(which("InterfaceCOLMAP")),
        "DensifyPointCloud": bool(which("DensifyPointCloud")),
        "ReconstructMesh": bool(which("ReconstructMesh")),
        "TextureMesh": bool(which("TextureMesh")),
        "blender": bool(which("blender")),
    }

    return {
        "status": "ok",
        "mode": "local-gpu-photogrammetry",
        "cuda": cuda,
        "gpu": gpu_name,
        "torch": torch_version,
        "work_dir": str(WORK_DIR),
        "tools": tools,
    }
