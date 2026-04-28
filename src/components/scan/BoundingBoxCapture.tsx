"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, RotateCcw, Video } from "lucide-react";

export type CaptureMetadata = {
  box: Box;
  viewport: { width: number; height: number };
  image: { width: number; height: number };
  framesTarget: number;
};

type Box = { x: number; y: number; w: number; h: number };
type DragState = { handle: string; startPctX: number; startPctY: number; startBox: Box };
type Phase = "aim" | "ready" | "recording" | "preview" | "error";

const MIN_BOX_PCT = 14;
const MAX_FRAMES = 120;
const MIN_FRAMES = 36;
const CAPTURE_MS = 250;

const HANDLES = [
  { id: "nw", left: "0%", top: "0%" },
  { id: "ne", left: "100%", top: "0%" },
  { id: "se", left: "100%", top: "100%" },
  { id: "sw", left: "0%", top: "100%" },
] as const;

const CURSOR: Record<string, string> = {
  nw: "nw-resize",
  ne: "ne-resize",
  se: "se-resize",
  sw: "sw-resize",
  move: "move",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function applyDrag(handle: string, box: Box, dx: number, dy: number): Box {
  let { x, y, w, h } = box;
  if (handle === "move") {
    return { x: clamp(x + dx, 0, 100 - w), y: clamp(y + dy, 0, 100 - h), w, h };
  }
  if (handle.includes("w")) {
    const nextW = clamp(w - dx, MIN_BOX_PCT, x + w);
    x = x + w - nextW;
    w = nextW;
  }
  if (handle.includes("e")) w = clamp(w + dx, MIN_BOX_PCT, 100 - x);
  if (handle.includes("n")) {
    const nextH = clamp(h - dy, MIN_BOX_PCT, y + h);
    y = y + h - nextH;
    h = nextH;
  }
  if (handle.includes("s")) h = clamp(h + dy, MIN_BOX_PCT, 100 - y);
  return { x, y, w, h };
}

function BoxOverlay({ box, dim = false }: { box: Box; dim?: boolean }) {
  const depth = Math.max(7, box.h * 0.16);
  const rear = {
    x: clamp(box.x + depth * 0.55, 0, 100),
    y: clamp(box.y - depth * 0.42, 0, 100),
    w: box.w,
    h: box.h,
  };

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none box3d-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon
        points={`${rear.x},${rear.y} ${rear.x + rear.w},${rear.y} ${rear.x + rear.w},${rear.y + rear.h} ${rear.x},${rear.y + rear.h}`}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.36)"
        strokeWidth="0.18"
        strokeDasharray="1 1"
      />
      <line x1={box.x} y1={box.y} x2={rear.x} y2={rear.y} stroke="rgba(255,255,255,0.82)" strokeWidth="0.28" />
      <line x1={box.x + box.w} y1={box.y} x2={rear.x + rear.w} y2={rear.y} stroke="rgba(255,255,255,0.82)" strokeWidth="0.28" />
      <line x1={box.x} y1={box.y + box.h} x2={rear.x} y2={rear.y + rear.h} stroke="rgba(255,255,255,0.82)" strokeWidth="0.28" />
      <line x1={box.x + box.w} y1={box.y + box.h} x2={rear.x + rear.w} y2={rear.y + rear.h} stroke="rgba(255,255,255,0.82)" strokeWidth="0.28" />
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill={dim ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.04)"}
        stroke="rgba(255,255,255,0.96)"
        strokeWidth="0.35"
      />
    </svg>
  );
}

export default function BoundingBoxCapture({
  onComplete,
}: {
  onComplete: (frames: Blob[], metadata: CaptureMetadata) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const framesRef = useRef<Blob[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const phaseRef = useRef<Phase>("aim");

  const [phase, setPhase] = useState<Phase>("aim");
  const [box, setBox] = useState<Box>({ x: 11, y: 25, w: 78, h: 48 });
  const [frameCount, setFrameCount] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((error) => {
        if (active) {
          setPhase("error");
          setErrorMsg(`Camera inaccessible: ${error.message}`);
        }
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const getPct = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
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
    function onMove(event: MouseEvent | TouchEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const point = "touches" in event ? event.touches[0] : event;
      const pct = getPct(point.clientX, point.clientY);
      setBox(applyDrag(drag.handle, drag.startBox, pct.x - drag.startPctX, pct.y - drag.startPctY));
    }
    function onEnd() {
      dragRef.current = null;
    }
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

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob || phaseRef.current !== "recording") return;
        framesRef.current.push(blob);
        setFrameCount(framesRef.current.length);
        if (framesRef.current.length >= MAX_FRAMES) finishRecording();
      },
      "image/jpeg",
      0.92,
    );
  }

  function startRecording() {
    framesRef.current = [];
    setFrameCount(0);
    setPhase("recording");
    captureFrame();
    timerRef.current = setInterval(captureFrame, CAPTURE_MS);
  }

  function finishRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const last = framesRef.current.at(-1);
    if (last) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(last));
    }
    setPhase("preview");
  }

  function metadata(): CaptureMetadata {
    const video = videoRef.current;
    return {
      box,
      viewport,
      image: {
        width: video?.videoWidth || 0,
        height: video?.videoHeight || 0,
      },
      framesTarget: MAX_FRAMES,
    };
  }

  function confirm() {
    onComplete([...framesRef.current], metadata());
  }

  function reset() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    framesRef.current = [];
    setFrameCount(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPhase("aim");
  }

  const progressPct = Math.round((frameCount / MAX_FRAMES) * 100);

  if (phase === "error") {
    return <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-500">{errorMsg}</div>;
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative aspect-[9/16] max-h-[760px] overflow-hidden rounded-lg bg-black select-none touch-none">
        <video ref={videoRef} className={`absolute inset-0 h-full w-full object-cover ${phase === "preview" ? "opacity-40" : ""}`} playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {phase === "aim" && (
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            <defs>
              <mask id="capture-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={`${box.x}%`} y={`${box.y}%`} width={`${box.w}%`} height={`${box.h}%`} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.38)" mask="url(#capture-mask)" />
          </svg>
        )}

        {(phase === "ready" || phase === "recording") && <BoxOverlay box={box} dim={phase === "recording"} />}

        {(phase === "aim" || phase === "ready") && (
          <div className="absolute" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
            <div
              className="bbox-border"
              style={{ cursor: CURSOR.move }}
              onMouseDown={(event) => {
                event.preventDefault();
                startDrag("move", event.clientX, event.clientY);
              }}
              onTouchStart={(event) => {
                event.preventDefault();
                startDrag("move", event.touches[0].clientX, event.touches[0].clientY);
              }}
            />
            {HANDLES.map((handle) => (
              <div
                key={handle.id}
                className="bbox-handle"
                style={{ left: handle.left, top: handle.top, cursor: CURSOR[handle.id] }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  startDrag(handle.id, event.clientX, event.clientY);
                }}
                onTouchStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  startDrag(handle.id, event.touches[0].clientX, event.touches[0].clientY);
                }}
              >
                <div className="bbox-handle-dot" />
              </div>
            ))}
          </div>
        )}

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <button type="button" className="rounded-lg bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur" onClick={reset}>
            Reset
          </button>
          {phase !== "aim" && (
            <button type="button" className="rounded-lg bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur" onClick={() => setPhase("aim")}>
              Next
            </button>
          )}
        </div>

        <div className="absolute left-6 right-6 top-[18%] text-white pointer-events-none">
          <p className="text-2xl font-bold drop-shadow">ARView Object Capture</p>
          <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/88 drop-shadow">
            Move around to ensure that the whole object is inside the box. Drag handles to manually resize.
          </p>
        </div>

        {phase === "recording" && (
          <div className="absolute inset-x-0 bottom-7 flex flex-col items-center gap-4">
            <div className="relative h-28 w-28">
              <div className="capture-ring absolute inset-0 rounded-full" style={{ "--capture-pct": `${progressPct * 3.6}deg` } as React.CSSProperties} />
              <div className="absolute inset-8 rounded-full bg-white/18 backdrop-blur" />
            </div>
            <div className="rounded-full bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur">{frameCount} / {MAX_FRAMES} photos</div>
          </div>
        )}

        {phase === "preview" && previewUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Derniere image capturee" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
              <CheckCircle className="h-4 w-4" />
              {frameCount} photos capturees
            </div>
          </>
        )}

        {phase !== "recording" && phase !== "preview" && (
          <button
            type="button"
            className="absolute bottom-14 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#147DFF] px-7 py-4 text-sm font-bold text-white shadow-lg"
            onClick={() => (phase === "aim" ? setPhase("ready") : startRecording())}
          >
            <Video className="h-4 w-4" />
            {phase === "aim" ? "Start Capture" : "Record"}
          </button>
        )}
      </div>

      {phase === "recording" && frameCount >= MIN_FRAMES && (
        <button type="button" className="btn-primary w-full" onClick={finishRecording}>
          Terminer avec {frameCount} photos
        </button>
      )}

      {phase === "preview" && (
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Recommencer
          </button>
          <button type="button" className="btn-primary flex-1" onClick={confirm}>
            Generer le modele 3D
          </button>
        </div>
      )}
    </div>
  );
}
