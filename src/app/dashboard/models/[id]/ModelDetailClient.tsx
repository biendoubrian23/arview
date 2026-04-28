"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Copy,
  Download,
  Trash2,
  ExternalLink,
  Save,
  Eye,
  Sparkles,
  Clock,
  Percent,
  ChevronLeft,
} from "lucide-react";
import ModelViewerEmbed from "@/components/ModelViewerEmbed";
import type { ModelRow } from "@/lib/types";
import { deleteModel, updateModel } from "@/app/dashboard/actions";

export default function ModelDetailClient({
  model,
  modelUrl,
  publicUrl,
  stats,
}: {
  model: ModelRow;
  modelUrl: string;
  publicUrl: string;
  stats: { views: string; ar: string; avg: string; rate: string };
}) {
  const [qrPng, setQrPng] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    QRCode.toDataURL(publicUrl, {
      width: 480,
      margin: 1,
      color: { dark: "#0A0A14", light: "#ffffff" },
    }).then(setQrPng);
    QRCode.toString(publicUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#0A0A14", light: "#ffffff" },
    }).then(setQrSvg);
  }, [publicUrl]);

  function copy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadPng() {
    const a = document.createElement("a");
    a.href = qrPng;
    a.download = `qr-${model.slug}.png`;
    a.click();
  }

  function downloadSvg() {
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${model.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/models"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" /> Mes Modèles
      </Link>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* VIEWER */}
        <div className="glass rounded-3xl p-2 overflow-hidden">
          <div className="aspect-square rounded-2xl overflow-hidden bg-linear-to-br from-[#6C63FF]/10 to-[#00D4FF]/10">
            <ModelViewerEmbed src={modelUrl} alt={model.name} />
          </div>
        </div>

        {/* META */}
        <div className="space-y-5">
          <form
            action={(fd) => startTransition(async () => { await updateModel(model.id, fd); })}
            className="glass rounded-3xl p-5 space-y-4"
          >
            <div>
              <label className="text-sm text-muted">Nom</label>
              <input
                name="name"
                defaultValue={model.name}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted">Description</label>
              <textarea
                name="description"
                defaultValue={model.description ?? ""}
                rows={2}
                className="input mt-1 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted">Catégorie</label>
                <input
                  name="category"
                  defaultValue={model.category ?? ""}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted">Visibilité</label>
                <select
                  name="visibility"
                  defaultValue={model.visibility}
                  className="input mt-1"
                  aria-label="Visibilité"
                >
                  <option value="public">Public</option>
                  <option value="private">Privé</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={pending} className="btn-ghost">
              <Save className="h-4 w-4" /> Enregistrer
            </button>
          </form>

          <div className="glass rounded-3xl p-5 space-y-4">
            <h2 className="font-semibold">Lien partageable</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-sm bg-[rgba(15,16,36,0.05)] rounded-xl px-3 py-2">
                {publicUrl}
              </code>
              <button onClick={copy} className="btn-ghost" type="button">
                <Copy className="h-4 w-4" /> {copied ? "Copié" : "Copier"}
              </button>
              <a href={publicUrl} target="_blank" className="btn-ghost">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
              {qrPng ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrPng}
                  alt="QR code"
                  className="h-28 w-28 rounded-xl bg-white p-1"
                />
              ) : (
                <div className="h-28 w-28 rounded-xl bg-[rgba(15,16,36,0.05)] animate-pulse" />
              )}
              <div className="flex flex-col gap-2">
                <button onClick={downloadPng} className="btn-ghost text-sm">
                  <Download className="h-4 w-4" /> Télécharger PNG
                </button>
                <button onClick={downloadSvg} className="btn-ghost text-sm">
                  <Download className="h-4 w-4" /> Télécharger SVG
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Vues", value: stats.views, icon: Eye },
              { label: "AR", value: stats.ar, icon: Sparkles },
              { label: "Durée moy.", value: stats.avg, icon: Clock },
              { label: "Taux AR", value: stats.rate, icon: Percent },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between text-muted">
                    <span className="text-xs">{s.label}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-xl font-bold gradient-text">{s.value}</p>
                </div>
              );
            })}
          </div>

          <form
            action={() => startTransition(async () => { await deleteModel(model.id); })}
            onSubmit={(e) => {
              if (!confirm("Supprimer définitivement ce modèle ?")) e.preventDefault();
            }}
          >
            <button
              type="submit"
              className="text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Supprimer ce modèle
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
