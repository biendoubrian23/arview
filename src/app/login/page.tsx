"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
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
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-muted">Heureux de te revoir.</p>
          <form
            className="mt-6 space-y-4"
            action={(fd) =>
              startTransition(async () => {
                const r = await signInAction(fd);
                if (r?.error) setError(r.error);
              })
            }
          >
            <div>
              <label className="text-sm text-muted">Email</label>
              <input name="email" type="email" required className="input mt-1" placeholder="toi@exemple.com" />
            </div>
            <div>
              <label className="text-sm text-muted">Mot de passe</label>
              <input name="password" type="password" required className="input mt-1" placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-6 text-sm text-muted text-center">
            Pas de compte ?{" "}
            <Link href="/signup" className="text-fg underline hover:no-underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
