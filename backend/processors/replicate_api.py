"""Cloud pipeline using Replicate API (TripoSR model).

How to get a Replicate API token (free):
    1. Go to https://replicate.com/ and sign up
    2. Account Settings → API tokens → Create token
    3. Add to backend/.env:  REPLICATE_API_TOKEN=r8_...

Free tier includes $10 of credits on signup (~300-500 TripoSR runs).
TripoSR model page: https://replicate.com/camenduru/triposr
"""

import asyncio
import base64
import os
import tempfile
from pathlib import Path
from typing import Callable

import aiohttp

WORK_DIR = Path(tempfile.gettempdir()) / "scanar_backend"
REPLICATE_API = "https://api.replicate.com/v1"

REPLICATE_MODEL = os.getenv("REPLICATE_MODEL", "camenduru/triposr")


async def process_with_replicate(image_path: Path, job_id: str, update_job: Callable) -> Path:
    api_token = os.getenv("REPLICATE_API_TOKEN", "")
    if not api_token:
        raise RuntimeError(
            "REPLICATE_API_TOKEN manquant dans backend/.env\n"
            "  Obtiens-le sur https://replicate.com/ (gratuit)"
        )

    output_dir = WORK_DIR / f"{job_id}_out"
    output_dir.mkdir(exist_ok=True)

    # Encode image as base64 data URI (avoids multipart upload complexity)
    with open(image_path, "rb") as f:
        raw = f.read()
    mime = "image/jpeg" if image_path.suffix == ".jpg" else "image/png"
    img_uri = f"data:{mime};base64,{base64.b64encode(raw).decode()}"

    headers = {
        "Authorization": f"Token {api_token}",
        "Content-Type": "application/json",
    }

    update_job(job_id, status="processing", progress=15, message="Envoi vers Replicate (cloud)…")

    async with aiohttp.ClientSession() as session:
        # Create prediction via model-name endpoint (no version hash needed)
        async with session.post(
            f"{REPLICATE_API}/models/{REPLICATE_MODEL}/predictions",
            headers=headers,
            json={"input": {"image": img_uri}},
        ) as resp:
            if resp.status not in (200, 201):
                body = await resp.text()
                raise RuntimeError(
                    f"Replicate HTTP {resp.status}: {body}\n"
                    "  → Vérifie REPLICATE_API_TOKEN et la version du modèle dans replicate_api.py"
                )
            pred = await resp.json()

        pred_id = pred["id"]
        poll_url = pred.get("urls", {}).get("get") or f"{REPLICATE_API}/predictions/{pred_id}"

        update_job(job_id, progress=25, message="Reconstruction 3D sur Replicate…")

        # Poll until done (max 10 min)
        for attempt in range(120):
            await asyncio.sleep(5)
            async with session.get(poll_url, headers=headers) as resp:
                data = await resp.json()

            status = data.get("status", "")

            if status == "succeeded":
                output = data.get("output")
                glb_url = output if isinstance(output, str) else (output[0] if output else None)
                if not glb_url:
                    raise RuntimeError("Replicate n'a pas retourné de fichier GLB.")

                update_job(job_id, progress=90, message="Téléchargement du modèle GLB…")
                async with session.get(glb_url) as dl:
                    glb_bytes = await dl.read()

                glb_path = output_dir / "model.glb"
                glb_path.write_bytes(glb_bytes)
                return glb_path

            elif status == "failed":
                raise RuntimeError(f"Replicate a échoué: {data.get('error', 'raison inconnue')}")

            else:
                progress = min(25 + attempt * 2, 85)
                update_job(job_id, progress=progress, message=f"Replicate: {status}…")

    raise RuntimeError("Timeout Replicate (10 minutes dépassées)")
