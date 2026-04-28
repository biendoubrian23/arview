import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Camera, Box } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: models } = await supabase
    .from("models")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mes Modèles</h1>
          <p className="text-muted mt-1">{models?.length ?? 0} modèle(s)</p>
        </div>
        <Link href="/dashboard/scan" className="btn-primary">
          <Camera className="h-4 w-4" /> Nouveau scan
        </Link>
      </div>

      {(!models || models.length === 0) ? (
        <div className="glass rounded-3xl p-12 text-center">
          <Box className="h-12 w-12 text-muted mx-auto" />
          <h2 className="mt-4 text-xl font-semibold">Aucun modèle pour l&apos;instant</h2>
          <p className="text-muted mt-1">
            Commence par scanner un objet ou uploader un fichier .glb.
          </p>
          <Link href="/dashboard/scan" className="btn-primary mt-6">
            <Camera className="h-4 w-4" /> Créer mon premier modèle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/models/${m.id}`}
              className="glass rounded-2xl p-4 hover:border-[#6C63FF]/40 transition group"
            >
              <div className="aspect-square rounded-xl bg-linear-to-br from-[#6C63FF]/20 to-[#00D4FF]/20 flex items-center justify-center">
                <Box className="h-12 w-12 text-fg/30 group-hover:text-fg/60 transition" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-semibold truncate">{m.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    m.status === "ready"
                      ? "bg-green-500/15 text-green-300"
                      : m.status === "processing"
                      ? "bg-yellow-500/15 text-yellow-300"
                      : m.status === "failed"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-[rgba(15,16,36,0.06)] text-muted"
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                {new Date(m.created_at).toLocaleDateString("fr-FR")} · /m/{m.slug}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
