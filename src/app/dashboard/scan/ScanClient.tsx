"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { createModelFromUpload } from "../actions";
import type { CaptureMetadata } from "@/components/scan/BoundingBoxCapture";

const BoundingBoxCapture = dynamic(
  () => import("@/components/scan/BoundingBoxCapture"),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-black animate-pulse" /> },
);

type Mode = "capture" | "upload";
type Step = "capture" | "meta" | "processing" | "done";
type BackendStatus = "checking" | "ok" | "offline" | "not-needed";

const SCAN_MODE = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";
const MODE_LABEL: Record<string, string> = {
  local: "GPU local photogrammetrie",
  replicate: "Cloud (Replicate)",
};

const PROCESSING_STEPS = [
  "Preparing images",
  "Finding camera poses",
  "Building point cloud",
  "Training Gaussian Splat",
  "Generating Mesh",
  "Optimizing",
];

export default function ScanClient() {
  const router = useRouter();
  const [mode,       setMode]       = useState<Mode>("capture");
  const [step,       setStep]       = useState<Step>("capture");
  const [glbFile,    setGlbFile]    = useState<File | null>(null);
  const [name,       setName]       = useState("");
  const [description,setDescription]= useState("");
  const [category,   setCategory]   = useState("Restaurant");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [progress,   setProgress]   = useState(0);
  const [progressMsg,setProgressMsg]= useState("");
  const [error,      setError]      = useState<string | null>(null);

  // Multi-frame capture result
  const framesRef    = useRef<Blob[]>([]);
  const captureRef   = useRef<CaptureMetadata | null>(null);
  const previewUrlRef= useRef<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Backend health (local mode only)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(
    SCAN_MODE === "local" ? "checking" : "not-needed"
  );
  const [backendInfo, setBackendInfo] = useState<string>("");

  useEffect(() => {
    if (SCAN_MODE !== "local") return;
    fetch("/api/health")
      .then(r => r.json())
      .then(d => {
        setBackendStatus(d.backend === "ok" ? "ok" : "offline");
        if (d.gpu) setBackendInfo(`GPU: ${d.gpu}`);
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  // ── Capture callback ────────────────────────────────────────────────────────
  function onCaptureComplete(frames: Blob[], metadata: CaptureMetadata) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    framesRef.current = frames;
    captureRef.current = metadata;
    setFrameCount(frames.length);
    if (frames.length > 0) {
      const url = URL.createObjectURL(frames[frames.length - 1]);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    }
    setStep("meta");
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Donne un nom à ton modèle."); return; }

    // Upload mode — direct GLB
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
      if (result && "error" in result) { setError(result.error ?? "Erreur inconnue"); setStep("meta"); }
      return;
    }

    // Capture mode — send frames to backend
    if (framesRef.current.length === 0) { setError("Lance d'abord une capture."); return; }

    setStep("processing");
    setProgress(5);
    setProgressMsg(`Envoi de ${framesRef.current.length} photos au backend…`);

    try {
      // Build FormData with all frames (API picks best for cloud, uses all for local)
      const fd = new FormData();
      framesRef.current.forEach((blob, i) => {
        fd.append("images", new File([blob], `frame_${String(i).padStart(3, "0")}.jpg`, { type: "image/jpeg" }));
      });
      if (captureRef.current) {
        fd.append("capture", JSON.stringify(captureRef.current));
      }

      const startRes  = await fetch("/api/scan/start", { method: "POST", body: fd });
      const startData = await startRes.json().catch(() => ({
        error: `Reponse serveur invalide (${startRes.status})`,
      }));
      if (!startRes.ok) throw new Error(startData.error ?? `HTTP ${startRes.status}`);
      const { job_id } = startData as { job_id: string };

      // Poll status
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

      // Finalize
      setProgress(96);
      setProgressMsg("Sauvegarde dans la bibliothèque…");
      const finalRes  = await fetch("/api/scan/finalize", {
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

  // ── Render ──────────────────────────────────────────────────────────────────
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

      {/* Backend status banner */}
      {SCAN_MODE === "local" && backendStatus !== "not-needed" && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border ${
          backendStatus === "ok"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : backendStatus === "offline"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-[rgba(108,99,255,0.08)] border-[rgba(108,99,255,0.15)] text-muted"
        }`}>
          {backendStatus === "ok"      && <Wifi className="h-4 w-4 shrink-0" />}
          {backendStatus === "offline" && <WifiOff className="h-4 w-4 shrink-0" />}
          {backendStatus === "checking"&& <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
          {backendStatus === "ok"      && <span>Backend GPU connecté{backendInfo && ` — ${backendInfo}`}</span>}
          {backendStatus === "offline" && <span>Backend Python hors ligne — <code className="font-mono text-xs">cd backend &amp;&amp; .\start.ps1</code></span>}
          {backendStatus === "checking"&& <span>Connexion au backend local…</span>}
        </div>
      )}

      {/* Mode tabs */}
      {step === "capture" && (
        <div className="flex gap-2 glass rounded-2xl p-1 w-fit">
          {(["capture", "upload"] as Mode[]).map(m => (
            <button
              key={m} type="button" onClick={() => setMode(m)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
                mode === m ? "bg-[rgba(108,99,255,0.10)] text-primary font-medium" : "text-muted hover:text-fg"
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

      {/* ── Step: Upload GLB ── */}
      {step === "capture" && mode === "upload" && (
        <div className="glass rounded-3xl p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> Importer un fichier 3D</h2>
          <label className="block cursor-pointer">
            <div className="rounded-2xl border-2 border-dashed border-[rgba(15,16,36,0.15)] hover:border-[#6C63FF]/50 transition p-8 text-center">
              <input type="file" accept=".glb,.gltf" className="hidden" onChange={e => { const f = e.target.files?.[0] ?? null; setGlbFile(f); if (f) setStep("meta"); }} />
              <Upload className="h-8 w-8 mx-auto text-muted mb-2" />
              <p className="text-sm text-muted">Choisis un fichier .glb ou .gltf (max 100 MB)</p>
            </div>
          </label>
        </div>
      )}

      {/* ── Step: Metadata form ── */}
      {step === "meta" && (
        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5">
          {/* Preview */}
          <div className="glass rounded-3xl p-5">
            {mode === "capture" && previewUrl ? (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {frameCount} photos capturées
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Dernière photo capturée" className="w-full rounded-xl aspect-video object-cover" />
                <button type="button" onClick={() => { framesRef.current = []; captureRef.current = null; setFrameCount(0); setPreviewUrl(null); setStep("capture"); }} className="btn-ghost text-sm w-full">
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

          {/* Form */}
          <div className="glass rounded-3xl p-5 space-y-4">
            <h2 className="font-semibold">Informations</h2>
            <div>
              <label className="text-sm text-muted">Nom de l&apos;objet *</label>
              <input value={name} onChange={e => setName(e.target.value)} required className="input mt-1" placeholder="Ex : Tajine du chef" />
            </div>
            <div>
              <label className="text-sm text-muted">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="input mt-1 resize-none" placeholder="Quelques mots…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="scan-category" className="text-sm text-muted">Catégorie</label>
                <select id="scan-category" aria-label="Catégorie" value={category} onChange={e => setCategory(e.target.value)} className="input mt-1">
                  {["Restaurant", "Déco", "Mode", "Bijoux", "Jouets", "Autre"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="scan-visibility" className="text-sm text-muted">Visibilité</label>
                <select id="scan-visibility" aria-label="Visibilité" value={visibility} onChange={e => setVisibility(e.target.value as "public" | "private")} className="input mt-1">
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
            <button type="submit" className="btn-primary w-full">Générer le modèle 3D</button>
          </div>
        </form>
      )}

      {/* ── Step: Processing ── */}
      {step === "processing" && (
        <div className="rounded-lg bg-[#17171d] p-8 text-white shadow-xl">
          <div className="mx-auto flex min-h-[420px] max-w-2xl flex-col justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold">ARView Object Capture</p>
              <p className="mt-8 text-xl font-bold">3D Modeling...</p>
            </div>

            <div className="mt-24 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span>{progressMsg || "Preparing images"}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/12">
                <div className="h-full rounded-full bg-[#147DFF] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-start gap-4 text-sm text-white/60">
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                <div>
                  <p>Keep app running while processing.</p>
                  <p>{SCAN_MODE === "local" ? "Local GPU pipeline: COLMAP, Splatfacto, OpenMVS." : "Cloud reconstruction in progress."}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-2 sm:grid-cols-2">
              {PROCESSING_STEPS.map((label) => {
                const active = progressMsg.includes(label);
                const done = progress > [8, 28, 82, 55, 86, 96][PROCESSING_STEPS.indexOf(label)];
                return (
                  <div key={label} className={`rounded-lg border px-3 py-2 text-xs ${active ? "border-[#147DFF] bg-[#147DFF]/15 text-white" : done ? "border-white/15 bg-white/8 text-white/75" : "border-white/10 text-white/35"}`}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
