"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Square, Video, Loader2, RotateCcw } from "lucide-react";
import { createModelFromUpload } from "../actions";

type Mode = "video" | "upload";

export default function ScanClient() {
  const [mode, setMode] = useState<Mode>("video");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Restaurant");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  // Video capture
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [glbFile, setGlbFile] = useState<File | null>(null);

  useEffect(() => {
    if (mode !== "video") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setError(
          "Impossible d'accéder à la caméra. Vérifie les permissions ou utilise l'onglet Upload."
        );
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  // Timer
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setElapsed(0);
    setVideoBlob(null);
    setVideoPreview(null);
    const mime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      setVideoBlob(blob);
      setVideoPreview(URL.createObjectURL(blob));
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function reset() {
    setVideoBlob(null);
    setVideoPreview(null);
    setElapsed(0);
    setGlbFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Donne un nom à ton modèle.");
      return;
    }
    if (!glbFile) {
      setError(
        "Joins un fichier .glb pour finaliser. Astuce : utilise l'app gratuite Luma AI pour générer le .glb à partir de ta vidéo, puis importe-le ici."
      );
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set("file", glbFile);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("category", category);
    fd.set("visibility", visibility);
    if (videoBlob) {
      const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
      fd.set("source_video", new File([videoBlob], `source.${ext}`, { type: videoBlob.type }));
    }
    const r = await createModelFromUpload(fd);
    if (r && "error" in r) {
      setError(r.error || "Erreur");
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Nouveau Scan</h1>
        <p className="text-muted mt-1">
          Scanne un objet avec ta caméra ou importe un fichier 3D existant.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 glass rounded-2xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("video")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
            mode === "video" ? "bg-[rgba(108,99,255,0.10)] text-primary font-medium" : "text-muted hover:text-fg"
          }`}
        >
          <Video className="h-4 w-4" /> Filmer
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
            mode === "upload" ? "bg-[rgba(108,99,255,0.10)] text-primary font-medium" : "text-muted hover:text-fg"
          }`}
        >
          <Upload className="h-4 w-4" /> Importer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5">
        {/* LEFT - capture */}
        <div className="glass rounded-3xl p-5 space-y-4">
          {mode === "video" ? (
            <>
              <h2 className="font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4" /> Capture vidéo
              </h2>
              <p className="text-xs text-muted">
                Tourne lentement autour de l&apos;objet pendant 30 à 60 secondes.
              </p>
              <div className="relative aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden bg-black">
                {!videoPreview ? (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                  />
                ) : (
                  <video
                    src={videoPreview}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    controls
                  />
                )}
                {recording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    REC {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                {!videoPreview ? (
                  !recording ? (
                    <button type="button" onClick={startRecording} className="btn-primary">
                      <Camera className="h-4 w-4" /> Démarrer
                    </button>
                  ) : (
                    <button type="button" onClick={stopRecording} className="btn-ghost">
                      <Square className="h-4 w-4" /> Arrêter
                    </button>
                  )
                ) : (
                  <button type="button" onClick={reset} className="btn-ghost">
                    <RotateCcw className="h-4 w-4" /> Refaire
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200/80">
                💡 La génération automatique du modèle 3D nécessite un service de
                photogrammétrie (Luma AI, Polycam…). Pour le moment, capture ta
                vidéo ici puis importe le fichier <strong>.glb</strong> généré
                ci-dessous. La vidéo source sera attachée à ton modèle.
              </div>
            </>
          ) : (
            <>
              <h2 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" /> Importer un .glb / .gltf
              </h2>
              <p className="text-xs text-muted">
                Glisse-dépose ton fichier 3D, ou clique pour choisir.
              </p>
            </>
          )}

          {/* GLB picker (commun) */}
          <label className="block">
            <span className="text-sm text-muted">Fichier 3D (.glb)</span>
            <div className="mt-1 rounded-2xl border-2 border-dashed border-[rgba(15,16,36,0.15)] hover:border-[#6C63FF]/50 transition p-6 text-center cursor-pointer">
              <input
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                className="hidden"
                onChange={(e) => setGlbFile(e.target.files?.[0] ?? null)}
              />
              {glbFile ? (
                <div>
                  <p className="font-medium">{glbFile.name}</p>
                  <p className="text-xs text-muted">
                    {(glbFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted" />
                  <p className="text-sm text-muted mt-2">
                    Choisis un fichier .glb (max 100 MB)
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* RIGHT - meta */}
        <div className="glass rounded-3xl p-5 space-y-4">
          <h2 className="font-semibold">Informations</h2>
          <div>
            <label className="text-sm text-muted">Nom de l&apos;objet *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input mt-1"
              placeholder="Ex : Tajine du chef"
            />
          </div>
          <div>
            <label className="text-sm text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input mt-1 resize-none"
              placeholder="Quelques mots…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input mt-1"
              >
                {["Restaurant", "Déco", "Mode", "Bijoux", "Jouets", "Autre"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Visibilité</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                className="input mt-1"
              >
                <option value="public">Public</option>
                <option value="private">Privé (lien requis)</option>
              </select>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Création…
              </>
            ) : (
              "Générer le lien et le QR code"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
