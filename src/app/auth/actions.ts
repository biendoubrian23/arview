"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const display_name = String(formData.get("display_name") || "").trim();
  if (!email || !password) return { error: "Email et mot de passe requis." };
  if (password.length < 6) return { error: "Mot de passe trop court (6+ caractères)." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name } },
  });
  if (error) return { error: error.message };

  // Confirmation email is disabled in Supabase → on connecte directement
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) return { error: signErr.message };
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
