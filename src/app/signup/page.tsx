"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";
import { Loader2, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="min-h-screen bg-blobs flex flex-col">
      <header className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block h-7 w-7 rounded-lg bg-linear-to-br from-[#6C63FF] to-[#00D4FF]" />
          <span>ScanAR</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-5 pb-10">
        <div className="relative z-10 glass rounded-3xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted">Gratuit. Sans carte bancaire.</p>
          <form
            className="mt-6 space-y-4"
            action={(fd) =>
              startTransition(async () => {
                const r = await signUpAction(fd);
                if (r?.error) setError(r.error);
              })
            }
          >
            <div>
              <label className="text-sm text-muted">Nom</label>
              <input name="display_name" type="text" className="input mt-1" placeholder="Ton nom" />
            </div>
            <div>
              <label className="text-sm text-muted">Email</label>
              <input name="email" type="email" required className="input mt-1" placeholder="toi@exemple.com" />
            </div>
            <div>
              <label className="text-sm text-muted">Mot de passe</label>
              <input name="password" type="password" required minLength={6} className="input mt-1" placeholder="6 caractères minimum" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-6 text-sm text-muted text-center">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-fg underline hover:no-underline">Connexion</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
