import { createSupabaseServer } from "@/lib/supabase/server";
import { updateProfile } from "@/app/dashboard/actions";
import { Save } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
        <p className="text-muted mt-1">Gère ton compte et ta marque.</p>
      </div>

      <form
        action={async (fd: FormData) => {
          "use server";
          await updateProfile(fd);
        }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-semibold">Mon compte</h2>
        <div>
          <label className="text-sm text-muted">Nom d&apos;affichage</label>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
            className="input mt-1"
            placeholder="Ton nom"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Email</label>
          <input
            value={user.email ?? ""}
            disabled
            className="input mt-1 opacity-60"
          />
        </div>
        <h2 className="font-semibold pt-4 border-t border-[rgba(15,16,36,0.08)]">Marque (page viewer)</h2>
        <div>
          <label className="text-sm text-muted">Nom de marque</label>
          <input
            name="brand_name"
            defaultValue={profile?.brand_name ?? ""}
            className="input mt-1"
            placeholder="Ex : Mon Restaurant"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Couleur d&apos;accent (hex)</label>
          <input
            name="brand_color"
            defaultValue={profile?.brand_color ?? "#6C63FF"}
            className="input mt-1"
            placeholder="#6C63FF"
          />
        </div>
        <button type="submit" className="btn-primary">
          <Save className="h-4 w-4" /> Enregistrer
        </button>
      </form>

      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold">Mon plan</h2>
        <p className="text-muted text-sm mt-1">
          Plan actuel :{" "}
          <span className="capitalize gradient-text font-semibold">
            {profile?.plan ?? "free"}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">
          La gestion des abonnements arrive bientôt.
        </p>
      </div>
    </div>
  );
}
