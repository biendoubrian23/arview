"""Local GPU pipeline using TripoSR (optimized for RTX 4070 Ti — 12 GB VRAM).

Prerequisites:
    cd backend
    git clone https://github.com/SUDO-AI-3D/TripoSR.git
    pip install -e TripoSR/
    pip install rembg[gpu]   # optional but improves quality

TripoSR model weights (~1.4 GB) are downloaded automatically on first run
from HuggingFace (stabilityai/TripoSR).
"""

import asyncio
import tempfile
from pathlib import Path
from typing import Callable

WORK_DIR = Path(tempfile.gettempdir()) / "scanar_backend"

# RTX 4070 Ti has 12 GB VRAM — chunk_size 8192 is safe and fast
CHUNK_SIZE = 8192
MESH_RESOLUTION = 256  # raise to 512 for higher detail (uses more VRAM)

# Singleton so the model loads only once per server lifetime
_model = None
_device = None


def _get_model():
    global _model, _device
    if _model is not None:
        return _model, _device

    import torch
    try:
        from tsr.system import TSR
    except ImportError:
        raise RuntimeError(
            "TripoSR n'est pas installé.\n\n"
            "  cd backend\n"
            "  git clone https://github.com/SUDO-AI-3D/TripoSR.git\n"
            "  pip install -e TripoSR/\n"
        )

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[TripoSR] Loading model on {_device.upper()}…")
    _model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    _model.renderer.set_chunk_size(CHUNK_SIZE)
    _model.to(_device)
    print(f"[TripoSR] Model ready on {_device.upper()}")
    return _model, _device


def _remove_background(image_path: Path) -> Path:
    """Remove background with rembg (GPU-accelerated if rembg[gpu] installed)."""
    try:
        from rembg import remove
        from PIL import Image

        img = Image.open(image_path).convert("RGB")
        result = remove(img)  # returns RGBA PNG

        out = image_path.parent / f"{image_path.stem}_nobg.png"
        result.save(out, "PNG")
        return out
    except ImportError:
        # rembg not installed — proceed without bg removal (still works)
        return image_path
    except Exception as exc:
        print(f"[rembg] Warning: {exc} — skipping background removal")
        return image_path


def _run_triposr(image_path: Path, output_dir: Path, job_id: str, update_job: Callable) -> Path:
    """Blocking TripoSR inference (runs in thread-pool to not block asyncio event loop)."""
    import torch
    from PIL import Image

    model, device = _get_model()
    update_job(job_id, progress=65, message=f"Inférence TripoSR ({device.upper()})…")

    img = Image.open(image_path).convert("RGBA")

    with torch.no_grad():
        scene_codes = model([img], device=device)

    update_job(job_id, progress=82, message="Extraction du maillage 3D…")
    meshes = model.extract_mesh(scene_codes, resolution=MESH_RESOLUTION)

    glb_path = output_dir / "model.glb"
    meshes[0].export(str(glb_path))

    # Free VRAM after export
    torch.cuda.empty_cache()

    return glb_path


async def process_with_triposr(image_path: Path, job_id: str, update_job: Callable) -> Path:
    """Full local pipeline: image → rembg → TripoSR → GLB."""
    output_dir = WORK_DIR / f"{job_id}_out"
    output_dir.mkdir(exist_ok=True)

    loop = asyncio.get_event_loop()

    # Step 1: Background removal (blocking I/O + ML, run in thread pool)
    update_job(job_id, status="processing", progress=20, message="Suppression du fond (rembg)…")
    clean_path = await loop.run_in_executor(None, _remove_background, image_path)

    # Step 2: TripoSR inference (GPU-bound, run in thread pool)
    update_job(job_id, progress=50, message="Chargement TripoSR / GPU…")
    glb_path = await loop.run_in_executor(
        None, _run_triposr, clean_path, output_dir, job_id, update_job
    )

    update_job(job_id, progress=95, message="Finalisation du modèle…")
    return glb_path
