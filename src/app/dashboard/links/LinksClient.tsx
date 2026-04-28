"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Download } from "lucide-react";

type Row = {
  id: string;
  name: string;
  slug: string;
  url: string;
  created_at: string;
  views: number;
  ar: number;
};

export default function LinksClient({ rows }: { rows: Row[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  function exportCsv() {
    const header = "name,slug,url,views,ar,created_at\n";
    const body = rows
      .map(
        (r) =>
          `"${r.name.replace(/"/g, '""')}",${r.slug},${r.url},${r.views},${r.ar},${r.created_at}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scanar-liens.csv";
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mes Liens</h1>
          <p className="text-muted mt-1">{rows.length} lien(s) actif(s)</p>
        </div>
        <button onClick={exportCsv} className="btn-ghost">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[rgba(15,16,36,0.04)] text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Objet</th>
                <th className="text-left px-4 py-3">Lien</th>
                <th className="text-right px-4 py-3">Vues</th>
                <th className="text-right px-4 py-3">AR</th>
                <th className="text-left px-4 py-3">Créé</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[rgba(15,16,36,0.04)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/models/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-muted">/m/{r.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-right">{r.views}</td>
                  <td className="px-4 py-3 text-right">{r.ar}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => copy(r.id, r.url)}
                        className="p-2 rounded-lg hover:bg-white/10"
                        title="Copier"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a
                        href={r.url}
                        target="_blank"
                        className="p-2 rounded-lg hover:bg-white/10"
                        title="Ouvrir"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    {copiedId === r.id && (
                      <p className="text-xs text-[#00D4FF]">Copié !</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
