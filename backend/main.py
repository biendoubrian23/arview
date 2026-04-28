"""ScanAR Python Backend — 3D reconstruction from image/video frames.

Modes (set via SCAN_MODE in .env):
  local     → TripoSR on local GPU (RTX 4070 Ti)
  replicate → TripoSR on Replicate cloud API
"""

import os
import uuid
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

SCAN_MODE = os.getenv("SCAN_MODE", "local")
WORK_DIR = Path(tempfile.gettempdir()) / "scanar_backend"
WORK_DIR.mkdir(exist_ok=True)

# In-memory job store (fine for local dev; use Redis for production)
jobs: dict[str, dict] = {}

app = FastAPI(title="ScanAR Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def update_job(job_id: str, **kwargs) -> None:
    jobs.setdefault(job_id, {}).update(kwargs)


async def run_pipeline(job_id: str, image_path: Path) -> None:
    try:
        if SCAN_MODE == "replicate":
            from processors.replicate_api import process_with_replicate
            glb_path = await process_with_replicate(image_path, job_id, update_job)
        else:
            from processors.local_gpu import process_with_triposr
            glb_path = await process_with_triposr(image_path, job_id, update_job)

        update_job(job_id, status="done", progress=100, message="Modèle prêt !", glb_path=str(glb_path))
    except Exception as exc:
        update_job(job_id, status="error", progress=0, message=str(exc))
    finally:
        image_path.unlink(missing_ok=True)


@app.post("/scan/start")
async def start_scan(image: UploadFile, background_tasks: BackgroundTasks):
    """Receive a JPEG frame and start 3D reconstruction in background."""
    job_id = str(uuid.uuid4())
    ext = ".jpg" if "jpeg" in (image.content_type or "") else ".png"
    image_path = WORK_DIR / f"{job_id}_input{ext}"
    image_path.write_bytes(await image.read())

    update_job(job_id, status="queued", progress=0, message="En file d'attente...", glb_path=None)
    background_tasks.add_task(run_pipeline, job_id, image_path)

    return {"job_id": job_id, "mode": SCAN_MODE}


@app.get("/scan/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return job


@app.get("/scan/result/{job_id}")
async def get_result(job_id: str):
    job = jobs.get(job_id)
    if not job or job.get("status") != "done":
        raise HTTPException(status_code=404, detail="Résultat non disponible")
    glb_path = Path(job["glb_path"])
    if not glb_path.exists():
        raise HTTPException(status_code=410, detail="Fichier expiré, relancer un scan")
    return FileResponse(path=glb_path, media_type="model/gltf-binary", filename="model.glb")


@app.get("/health")
async def health():
    """Check GPU availability and current mode."""
    gpu_name = None
    cuda = False
    try:
        import torch
        cuda = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda else None
    except ImportError:
        pass
    return {"status": "ok", "mode": SCAN_MODE, "cuda": cuda, "gpu": gpu_name}
