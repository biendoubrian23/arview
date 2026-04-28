"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { createModelFromUpload } from "../actions";

// BoundingBoxCapture needs browser APIs (camera, canvas) — load client-only
const BoundingBoxCapture = dynamic(
  () => import("@/components/scan/BoundingBoxCapture"),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-black animate-pulse" /> },
);

type Mode = "capture" | "upload";
type Step = "capture" | "meta" | "processing" | "done";

const SCAN_MODE = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";

const MODE_LABEL: Record<string, string> = {
  local: "GPU local (RTX 4070 Ti)",
  replicate: "Cloud (Replicate)",
};

export default function ScanClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("capture");
  const [step, setStep] = useState<Step>("capture");

  // Captured data
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [frameBlob, setFrameBlob] = useState<Blob | null>(null);
  const [glbFile, setGlbFile] = useState<File | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Restaurant");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  // Progress
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Capture callback ───────────────────────────────────────────────────────
  function onCaptureComplete(vBlob: Blob, fBlob: Blob) {
    setVideoBlob(vBlob);
    setFrameBlob(fBlob);
    setStep("meta");
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Donne un nom à ton modèle."); return; }

    // ── Import mode (direct GLB upload, unchanged flow) ────────────────────
    if (mode === "upload") {
      if (!glbFile) { setError("Sélectionne un fichier .glb"); return; }
      setStep("processing");
      setProgress(10);
      setProgressMsg("Upload du fichier 3D…");
      const fd = new FormData();
      fd.set("file", glbFile);
      fd.set("name", name);
      fd.set("description", description);
      fd.set("category", category);
      fd.set("visibility", visibility);
      const result = await createModelFromUpload(fd);
      if (result && "error" in result) {
        setError(result.error ?? "Erreur inconnue");
        setStep("meta");
      }
      return; // server action redirects on success
    }

    // ── Capture mode (video → backend → GLB) ──────────────────────────────
    if (!frameBlob) { setError("Lance d'abord une capture."); return; }

    setStep("processing");
    setProgress(5);
    setProgressMsg("Envoi du frame au backend…");

    try {
      // 1. Send frame to /api/scan/start
      const fd = new FormData();
      fd.set("image", new File([frameBlob], "frame.jpg", { type: "image/jpeg" }));
      const startRes = await fetch("/api/scan/start", { method: "POST", body: fd });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error ?? `HTTP ${startRes.status}`);
      const { job_id } = startData as { job_id: string };

      // 2. Poll status
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 2500));
        const statusRes = await fetch(`/api/scan/status/${job_id}`);
        const status = await statusRes.json();
        setProgress(status.progress ?? 0);
        setProgressMsg(status.message ?? "Traitement en cours…");
        if (status.status === "done") { done = true; }
        else if (status.status === "error") throw new Error(status.message ?? "Erreur backend");
      }

      // 3. Finalize (Next.js downloads GLB + uploads to Supabase)
      setProgress(96);
      setProgressMsg("Sauvegarde dans la bibliothèque…");
      const finalRes = await fetch("/api/scan/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job_id, name, description, category, visibility }),
      });
      const finalData = await finalRes.json();
      if (!finalRes.ok) throw new Error(finalData.error ?? `HTTP ${finalRes.status}`);

      setProgress(100);
      setProgressMsg("Modèle créé !");
      router.push(`/dashboard/models/${finalData.modelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("meta");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Nouveau Scan</h1>
        <p className="text-muted mt-1 text-sm">
          Scanne un objet avec ta caméra ou importe un fichier 3D.
          {step === "capture" && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[rgba(108,99,255,0.08)] text-primary px-2 py-0.5 rounded-full">
              Mode : {MODE_LABEL[SCAN_MODE] ?? SCAN_MODE}
            </span>
          )}
        </p>
      </div>

      {/* Mode tabs */}
      {step === "capture" && (
        <div className="flex gap-2 glass rounded-2xl p-1 w-fit">
          {(["capture", "upload"] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
                mode === m
                  ? "bg-[rgba(108,99,255,0.10)] text-primary font-medium"
                  : "text-muted hover:text-fg"
              }`}
            >
              {m === "capture" ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {m === "capture" ? "Filmer" : "Importer .glb"}
            </button>
          ))}
        </div>
      )}

      {/* ── Step: Capture ── */}
      {step === "capture" && mode === "capture" && (
        <div className="glass rounded-3xl p-5">
          <BoundingBoxCapture onComplete={onCaptureComplete} />
        </div>
      )}

      {/* ── Step: Upload GLB (same tab, no backend needed) ── */}
      {step === "capture" && mode === "upload" && (
        <div className="glass rounded-3xl p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importer un fichier 3D
          </h2>
          <label className="block cursor-pointer">
            <div className="rounded-2xl border-2 border-dashed border-[rgba(15,16,36,0.15)] hover:border-[#6C63FF]/50 transition p-8 text-center">
              <input
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setGlbFile(f);
                  if (f) setStep("meta");
                }}
              />
              <Upload className="h-8 w-8 mx-auto text-muted mb-2" />
              <p className="text-sm text-muted">Choisis un fichier .glb ou .gltf (max 100 MB)</p>
            </div>
          </label>
        </div>
      )}

      {/* ── Step: Metadata form ── */}
      {step === "meta" && (
        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5">
          {/* Preview panel */}
          <div className="glass rounded-3xl p-5">
            {frameBlob && mode === "capture" ? (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Frame capturé
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(frameBlob)}
                  alt="Frame extrait"
                  className="w-full rounded-xl aspect-video object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setFrameBlob(null); setVideoBlob(null); setStep("capture"); }}
                  className="btn-ghost text-sm w-full"
                >
                  Recapturer
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Fichier sélectionné</p>
                <p className="text-muted text-sm truncate">{glbFile?.name}</p>
                <p className="text-xs text-muted">{glbFile ? `${(glbFile.size / 1024 / 1024).toFixed(1)} MB` : ""}</p>
              </div>
            )}
          </div>

          {/* Form panel */}
          <div className="glass rounded-3xl p-5 space-y-4">
            <h2 className="font-semibold">Informations</h2>
            <div>
              <label className="text-sm text-muted">Nom de l&apos;objet *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="input mt-1"
                placeholder="Ex : Tajine du chef"
              />
            </div>
            <div>
              <label className="text-sm text-muted">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="input mt-1 resize-none"
                placeholder="Quelques mots…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="scan-category" className="text-sm text-muted">Catégorie</label>
                <select
                  id="scan-category"
                  aria-label="Catégorie"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="input mt-1"
                >
                  {["Restaurant", "Déco", "Mode", "Bijoux", "Jouets", "Autre"].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="scan-visibility" className="text-sm text-muted">Visibilité</label>
                <select
                  id="scan-visibility"
                  aria-label="Visibilité"
                  value={visibility}
                  onChange={e => setVisibility(e.target.value as "public" | "private")}
                  className="input mt-1"
                >
                  <option value="public">Public</option>
                  <option value="private">Privé</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              Générer le modèle 3D
            </button>
          </div>
        </form>
      )}

      {/* ── Step: Processing ── */}
      {step === "processing" && (
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <svg className="absolute inset-0 -rotate-90 h-20 w-20">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="6" />
              <circle
                className="scan-arc"
                cx="40" cy="40" r="34"
                fill="none"
                stroke="url(#scan-grad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
              />
              <defs>
                <linearGradient id="scan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6C63FF" />
                  <stop offset="100%" stopColor="#00D4FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold gradient-text">{progress}%</p>
            <p className="text-muted text-sm mt-1">{progressMsg}</p>
          </div>
          <div className="w-full max-w-xs bg-[rgba(15,16,36,0.06)] rounded-full h-2 overflow-hidden">
            <div
              className="scan-progress h-full rounded-full bg-linear-to-r from-[#6C63FF] to-[#00D4FF]"
              style={{ "--scan-pct": `${progress}%` } as React.CSSProperties}
            />
          </div>
          <p className="text-xs text-muted text-center">
            {SCAN_MODE === "local"
              ? "Reconstruction 3D sur ton GPU RTX 4070 Ti…"
              : "Reconstruction 3D sur Replicate (cloud)…"}
          </p>
        </div>
      )}
    </div>
  );
}
