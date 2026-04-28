"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Square, RotateCcw, CheckCircle, Loader2 } from "lucide-react";

// Box dimensions stored as percentages (0–100) of container size
type Box = { x: number; y: number; w: number; h: number };

type DragState = {
  handle: string;
  startPctX: number;
  startPctY: number;
  startBox: Box;
};

type Phase = "live" | "recording" | "extracting" | "preview" | "error";

const MIN_BOX_PCT = 15; // minimum box size in %

const HANDLES = [
  { id: "nw", left: "0%",   top: "0%"   },
  { id: "n",  left: "50%",  top: "0%"   },
  { id: "ne", left: "100%", top: "0%"   },
  { id: "e",  left: "100%", top: "50%"  },
  { id: "se", left: "100%", top: "100%" },
  { id: "s",  left: "50%",  top: "100%" },
  { id: "sw", left: "0%",   top: "100%" },
  { id: "w",  left: "0%",   top: "50%"  },
] as const;

const CURSOR: Record<string, string> = {
  nw: "nw-resize", n: "n-resize", ne: "ne-resize",
  e: "e-resize", se: "se-resize", s: "s-resize",
  sw: "sw-resize", w: "w-resize", move: "move",
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function applyDrag(handle: string, sb: Box, dx: number, dy: number): Box {
  let { x, y, w, h } = sb;
  switch (handle) {
    case "move":
      return { x: clamp(x + dx, 0, 100 - w), y: clamp(y + dy, 0, 100 - h), w, h };
    case "nw": {
      const nw = Math.max(MIN_BOX_PCT, w - dx);
      const nh = Math.max(MIN_BOX_PCT, h - dy);
      return { x: x + w - nw, y: y + h - nh, w: nw, h: nh };
    }
    case "ne": {
      const nh = Math.max(MIN_BOX_PCT, h - dy);
      return { x, y: y + h - nh, w: clamp(w + dx, MIN_BOX_PCT, 100 - x), h: nh };
    }
    case "se":
      return { x, y, w: clamp(w + dx, MIN_BOX_PCT, 100 - x), h: clamp(h + dy, MIN_BOX_PCT, 100 - y) };
    case "sw": {
      const nw = Math.max(MIN_BOX_PCT, w - dx);
      return { x: x + w - nw, y, w: nw, h: clamp(h + dy, MIN_BOX_PCT, 100 - y) };
    }
    case "n": {
      const nh = Math.max(MIN_BOX_PCT, h - dy);
      return { x, y: y + h - nh, w, h: nh };
    }
    case "s":
      return { x, y, w, h: clamp(h + dy, MIN_BOX_PCT, 100 - y) };
    case "e":
      return { x, y, w: clamp(w + dx, MIN_BOX_PCT, 100 - x), h };
    case "w": {
      const nw = Math.max(MIN_BOX_PCT, w - dx);
      return { x: x + w - nw, y, w: nw, h };
    }
    default:
      return sb;
  }
}

export default function BoundingBoxCapture({
  onComplete,
}: {
  onComplete: (videoBlob: Blob, frameBlob: Blob) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [phase, setPhase] = useState<Phase>("live");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<Blob | null>(null);
  const [box, setBox] = useState<Box>({ x: 15, y: 15, w: 70, h: 70 });
  const dragRef = useRef<DragState | null>(null);

  // ── Camera init ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          await liveVideoRef.current.play().catch(() => {});
        }
      } catch {
        setPhase("error");
        setErrorMsg("Impossible d'accéder à la caméra. Vérifie les permissions dans ton navigateur.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Recording ─────────────────────────────────────────────────────────────
  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setElapsed(0);
    const mime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      setCapturedVideo(blob);
      const url = URL.createObjectURL(blob);
      setVideoBlobUrl(url);
      setPhase("extracting");
      extractFrame(blob, url);
    };
    rec.start();
    recorderRef.current = rec;
    setPhase("recording");
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  // ── Frame extraction ──────────────────────────────────────────────────────
  function extractFrame(videoBlob: Blob, blobUrl: string) {
    const vid = document.createElement("video");
    vid.src = blobUrl;
    vid.preload = "metadata";
    vid.muted = true;
    vid.playsInline = true;

    vid.onloadedmetadata = () => {
      vid.currentTime = vid.duration * 0.45; // ~middle of capture
    };

    vid.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      canvas.getContext("2d")!.drawImage(vid, 0, 0);
      canvas.toBlob(
        frameBlob => {
          if (frameBlob) {
            setPhase("preview");
            // Keep the preview video to display
            if (previewVideoRef.current) {
              previewVideoRef.current.src = blobUrl;
            }
            // Pass both blobs upward when user confirms
            (vid as HTMLVideoElement & { _frameBlob?: Blob })._frameBlob = frameBlob;
            // Store on window temporarily
            (window as unknown as Record<string, unknown>).__scanFrameBlob = frameBlob;
          } else {
            setPhase("error");
            setErrorMsg("Extraction du frame échouée. Réessaie.");
          }
        },
        "image/jpeg",
        0.92,
      );
    };

    vid.onerror = () => {
      setPhase("error");
      setErrorMsg("Impossible de lire la vidéo enregistrée.");
    };
  }

  function confirmFrame() {
    const frameBlob = (window as unknown as Record<string, unknown>).__scanFrameBlob as Blob | undefined;
    if (!capturedVideo || !frameBlob) return;
    delete (window as unknown as Record<string, unknown>).__scanFrameBlob;
    onComplete(capturedVideo, frameBlob);
  }

  function reset() {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    setVideoBlobUrl(null);
    setCapturedVideo(null);
    setElapsed(0);
    setPhase("live");
  }

  // ── Drag / Resize ─────────────────────────────────────────────────────────
  const getPct = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    };
  }, []);

  const startDrag = useCallback(
    (handle: string, clientX: number, clientY: number) => {
      const pct = getPct(clientX, clientY);
      dragRef.current = { handle, startPctX: pct.x, startPctY: pct.y, startBox: box };
    },
    [box, getPct],
  );

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      const { clientX, clientY } =
        "touches" in e ? e.touches[0] : (e as MouseEvent);
      const pct = getPct(clientX, clientY);
      const dx = pct.x - d.startPctX;
      const dy = pct.y - d.startPctY;
      setBox(applyDrag(d.handle, d.startBox, dx, dy));
    }
    function onEnd() { dragRef.current = null; }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, [getPct]);

  // ── Render ────────────────────────────────────────────────────────────────
  const showBoundingBox = phase === "live" || phase === "recording";

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden bg-black select-none touch-none"
      >
        {/* Live camera */}
        <video
          ref={liveVideoRef}
          className={`absolute inset-0 w-full h-full object-cover ${phase === "preview" || phase === "extracting" ? "hidden" : ""}`}
          playsInline
          muted
        />

        {/* Preview video */}
        {(phase === "preview" || phase === "extracting") && (
          <video
            ref={previewVideoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            controls={phase === "preview"}
            autoPlay={phase === "extracting"}
            muted
            loop
          />
        )}

        {/* Dark vignette outside bounding box */}
        {showBoundingBox && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="scanar-box-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={`${box.x}%`}
                  y={`${box.y}%`}
                  width={`${box.w}%`}
                  height={`${box.h}%`}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#scanar-box-mask)" />
          </svg>
        )}

        {/* Bounding box widget */}
        {showBoundingBox && (
          <div
            className="absolute"
            style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
          >
            {/* Glowing border + move handle */}
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                border: "2px solid rgba(255,255,255,0.92)",
                boxShadow:
                  "0 0 0 1px rgba(0,180,255,0.4), 0 0 16px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.04)",
                cursor: CURSOR.move,
              }}
              onMouseDown={e => { e.preventDefault(); startDrag("move", e.clientX, e.clientY); }}
              onTouchStart={e => { e.preventDefault(); startDrag("move", e.touches[0].clientX, e.touches[0].clientY); }}
            />

            {/* Resize handles */}
            {HANDLES.map(h => (
              <div
                key={h.id}
                className="absolute z-10"
                style={{
                  left: h.left,
                  top: h.top,
                  width: 18,
                  height: 18,
                  transform: "translate(-50%, -50%)",
                  cursor: CURSOR[h.id],
                  touchAction: "none",
                }}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startDrag(h.id, e.clientX, e.clientY); }}
                onTouchStart={e => { e.preventDefault(); e.stopPropagation(); startDrag(h.id, e.touches[0].clientX, e.touches[0].clientY); }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: "white",
                    boxShadow: "0 0 10px rgba(0,180,255,0.9), 0 0 3px white",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Recording indicator */}
        {phase === "recording" && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            REC {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </div>
        )}

        {/* Instruction banner */}
        {phase === "live" && (
          <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/65 to-transparent p-4 pointer-events-none">
            <p className="text-white text-sm font-semibold">AR Object Capture</p>
            <p className="text-white/80 text-xs mt-0.5">
              Glisse les coins pour cadrer ton objet. Tourne autour pendant 20-40s.
            </p>
          </div>
        )}

        {/* Extracting spinner */}
        {phase === "extracting" && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-3">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="text-white text-sm">Extraction du frame…</p>
          </div>
        )}

        {/* Preview checkmark */}
        {phase === "preview" && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-green-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            <CheckCircle className="h-3.5 w-3.5" /> Capture prête
          </div>
        )}

        {/* Error overlay */}
        {phase === "error" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6">
            <p className="text-white text-sm text-center">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        {phase === "live" && (
          <button type="button" onClick={startRecording} className="btn-primary">
            <Camera className="h-4 w-4" /> Démarrer la capture
          </button>
        )}
        {phase === "recording" && (
          <button type="button" onClick={stopRecording} className="btn-ghost">
            <Square className="h-4 w-4" />
            Arrêter ({Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")})
          </button>
        )}
        {phase === "preview" && (
          <>
            <button type="button" onClick={confirmFrame} className="btn-primary">
              <CheckCircle className="h-4 w-4" /> Utiliser cette capture
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              <RotateCcw className="h-4 w-4" /> Recommencer
            </button>
          </>
        )}
        {phase === "live" && (
          <button
            type="button"
            onClick={() => setBox({ x: 15, y: 15, w: 70, h: 70 })}
            className="btn-ghost"
            title="Réinitialiser le cadre"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
