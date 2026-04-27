import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/models — Créer un modèle après upload R2
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // TODO: valider le body, insérer dans Supabase
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}

// GET /api/models — Liste des modèles de l'utilisateur connecté
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("models")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
