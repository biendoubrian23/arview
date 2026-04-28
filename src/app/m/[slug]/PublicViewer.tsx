"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, RotateCw } from "lucide-react";

export default function PublicViewer({
  modelId,
  name,
  description,
  src,
  brandName,
  brandColor,
}: {
  modelId: string;
  name: string;
  description: string | null;
  src: string;
  brandName: string;
  brandColor: string;
}) {
  const mvRef = useRef<HTMLElement | null>(null);
  const startRef = useRef<number>(Date.now());
  const arSentRef = useRef(false);

  // Track view on mount + session_end on unmount
  useEffect(() => {
    track("view");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendSessionEnd();
    };
    const onUnload = () => sendSessionEnd();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      sendSessionEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  // Track ar_activated when AR session starts
  useEffect(() => {
    const el = mvRef.current as (HTMLElement & { addEventListener: typeof window.addEventListener }) | null;
    if (!el) return;
    const onArStatus = (ev: Event) => {
      const status = (ev as CustomEvent).detail?.status;
      if (status === "session-started" && !arSentRef.current) {
        arSentRef.current = true;
        track("ar_activated");
      }
    };
    el.addEventListener("ar-status", onArStatus as EventListener);
    return () => el.removeEventListener("ar-status", onArStatus as EventListener);
  }, []);

  function track(type: "view" | "ar_activated") {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ model_id: modelId, type, referrer: document.referrer }),
    }).catch(() => {});
  }

  function sendSessionEnd() {
    const duration_ms = Date.now() - startRef.current;
    if (duration_ms < 1000) return;
    const data = JSON.stringify({
      model_id: modelId,
      type: "session_end",
      duration_ms,
      referrer: document.referrer,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([data], { type: "application/json" })
      );
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: data,
      }).catch(() => {});
    }
  }

  function activateAR() {
    const el = mvRef.current as (HTMLElement & { activateAR?: () => void }) | null;
    if (el?.activateAR) el.activateAR();
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between border-b border-[rgba(15,16,36,0.08)]">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            className="inline-block h-6 w-6 rounded-md"
            style={{
              background: `linear-gradient(135deg, ${brandColor}, #00D4FF)`,
            } as React.CSSProperties}
          />
          <span>{brandName}</span>
        </Link>
        <Link
          href="/signup"
          className="text-xs text-muted hover:text-fg"
        >
          Propulsé par ScanAR
        </Link>
      </header>

      <div className="flex-1 relative">
        <model-viewer
          ref={mvRef as React.RefObject<HTMLElement>}
          src={src}
          alt={name}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          ar-placement="floor"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          exposure="1"
          tone-mapping="aces"
          interaction-prompt="auto"
          loading="eager"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            inset: 0,
            background: "transparent",
          } as React.CSSProperties}
        />

        <div className="absolute left-0 right-0 bottom-6 px-5 flex flex-col items-center gap-3 pointer-events-none">
          <div className="glass rounded-2xl px-4 py-3 max-w-md w-full text-center pointer-events-auto">
            <h1 className="font-semibold text-lg">{name}</h1>
            {description && (
              <p className="text-sm text-muted mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <button
            onClick={activateAR}
            className="btn-primary pointer-events-auto"
            type="button"
          >
            <Sparkles className="h-4 w-4" /> Voir en AR
          </button>
          <p className="text-[11px] text-muted/70 pointer-events-none flex items-center gap-1">
            <RotateCw className="h-3 w-3" /> Rotation, zoom, AR avec ta caméra
          </p>
        </div>
      </div>
    </main>
  );
}
