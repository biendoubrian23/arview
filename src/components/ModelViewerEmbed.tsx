"use client";

import { useEffect, useRef } from "react";

export default function ModelViewerEmbed({
  src,
  poster,
  alt = "Modèle 3D",
}: {
  src: string;
  poster?: string;
  alt?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  // Aucun script à charger ici : <model-viewer> est inclus globalement dans <head>
  useEffect(() => {
    // Force re-render si src change
    if (ref.current) {
      (ref.current as HTMLElement & { src?: string }).src = src;
    }
  }, [src]);

  return (
    <model-viewer
      ref={ref as React.RefObject<HTMLElement>}
      src={src}
      alt={alt}
      poster={poster}
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
        background: "transparent",
        "--poster-color": "transparent",
      } as React.CSSProperties}
    />
  );
}
