# ARView GPU Photogrammetry Backend

This backend is designed for Docker Desktop on Windows with the WSL2 GPU backend.

## Start

From the repository root:

```powershell
docker compose up --build
```

Production packaging:

```powershell
docker compose -f docker-compose.prod.yml up --build
```

Backend:

```text
http://localhost:8050
```

Frontend:

```text
http://localhost:3050
```

## GPU validation

Docker Desktop must expose the NVIDIA GPU:

```powershell
docker run --rm --gpus=all nvcr.io/nvidia/k8s/cuda-sample:nbody nbody -gpu -benchmark
```

Then check the backend:

```powershell
curl http://localhost:8050/health
```

## Pipeline

1. The browser captures 80 to 120 guided frames with a movable white object box.
2. The backend filters blurry frames and crops around the capture box.
3. `ns-process-data images` runs COLMAP to recover camera poses and sparse geometry.
4. `ns-train splatfacto-big` trains a Gaussian Splat on the local NVIDIA GPU.
5. `ns-export gaussian-splat` exports the faithful `.ply` splat.
6. COLMAP dense reconstruction generates a mesh. OpenMVS can be enabled later, but is disabled by default so the Docker GPU image builds reliably on Docker Desktop/Ubuntu 22.04.
7. Blender exports `model.glb` for `<model-viewer>` web AR.

## Performance knobs

Set these in `docker-compose.yml`:

```yaml
ARVIEW_MAX_FRAMES: "160"
ARVIEW_IMAGE_MAX_SIZE: "1800"
ARVIEW_SPLAT_METHOD: splatfacto-big
ARVIEW_ENABLE_OPENMVS: "0"
```

For faster first tests, use:

```yaml
ARVIEW_MAX_FRAMES: "80"
ARVIEW_IMAGE_MAX_SIZE: "1400"
ARVIEW_SPLAT_METHOD: splatfacto
```

## Phone testing over HTTPS

Mobile camera capture needs a secure context. The recommended setup is Cloudflare Tunnel exposing only the frontend; the frontend talks to the backend inside Docker through `PYTHON_BACKEND_URL=http://backend:8000`.

Temporary tunnel:

```powershell
& "$env:TEMP\cloudflared.exe" tunnel --url http://127.0.0.1:3050
```

Persistent tunnel:

1. Create a Cloudflare Tunnel in Zero Trust.
2. Add a public hostname that points to `http://web:3000`.
3. Put the connector token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN=...`.
4. Set `NEXT_PUBLIC_APP_URL=https://your-domain.example` in `.env` so QR/public links use the same HTTPS host.
5. Start:

```powershell
npm run docker:tunnel
```
