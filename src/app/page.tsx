import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Link2,
  Sparkles,
  Check,
  QrCode,
  BarChart3,
  Utensils,
  Sofa,
  Footprints,
  Gem,
  ToyBrick,
  Store,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen text-fg">
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-[rgba(15,16,36,0.08)]">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="inline-block h-7 w-7 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4FF]" />
            <span>ScanAR</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="#how" className="hover:text-fg">Comment ça marche</a>
            <a href="#use-cases" className="hover:text-fg">Cas d&apos;usage</a>
            <a href="#pricing" className="hover:text-fg">Tarifs</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-muted hover:text-fg px-3 py-2">
              Connexion
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Commencer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-blobs relative">
        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-20 pb-24 md:pt-32 md:pb-36 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#00D4FF]" />
            Réalité augmentée • Sans app • iPhone &amp; Android
          </span>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Scanne. Partage. <br />
            <span className="gradient-text">Pose dans ton salon.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto">
            N&apos;importe quel objet en 3D dans le monde réel. Sans app. Via un simple lien.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn-primary">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="btn-ghost">Voir une démo</a>
          </div>

          <div className="mt-12 mx-auto max-w-md glass rounded-2xl p-4 flex items-center gap-3">
            <QrCode className="h-10 w-10 text-[#00D4FF]" />
            <div className="text-left flex-1">
              <p className="text-xs text-muted">Lien partageable</p>
              <p className="font-mono text-sm">scanar.io/m/example</p>
            </div>
            <span className="text-xs text-muted">+2 000 objets cette semaine</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-3xl md:text-5xl font-bold text-center">Comment ça marche</h2>
        <p className="mt-4 text-center text-muted max-w-2xl mx-auto">
          Trois étapes. 30 secondes chrono.
        </p>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            { icon: Camera, title: "Filme ton objet", desc: "Tourne autour pendant 30 secondes avec ton téléphone." },
            { icon: Link2, title: "Reçois un lien", desc: "QR code + URL générés instantanément." },
            { icon: Sparkles, title: "Pose-le partout", desc: "Tes visiteurs le voient en AR depuis leur navigateur." },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-7">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] flex items-center justify-center mb-5">
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold">
                <span className="text-muted text-sm mr-2">0{i + 1}.</span>
                {s.title}
              </h3>
              <p className="mt-2 text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="bg-bg-2 border-y border-[rgba(15,16,36,0.08)]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-3xl md:text-5xl font-bold text-center">
            Pour n&apos;importe quel objet du monde réel
          </h2>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { i: Utensils, t: "Restaurants", d: "Vos clients voient le plat avant de commander." },
              { i: Sofa, t: "Déco & Meubles", d: "Essayez le canapé dans votre salon." },
              { i: Footprints, t: "Mode & Sneakers", d: "Visualisez la chaussure à vos pieds." },
              { i: Gem, t: "Bijoux", d: "Portez virtuellement avant d'offrir." },
              { i: ToyBrick, t: "Jouets", d: "Voyez le contenu avant déballage." },
              { i: Store, t: "E-commerce", d: "Réduisez vos retours de 40%." },
            ].map((c, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <c.i className="h-7 w-7 text-[#00D4FF]" />
                <h3 className="mt-4 font-semibold">{c.t}</h3>
                <p className="mt-1 text-sm text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold">
              Sachez qui interagit <br /> avec vos objets
            </h2>
            <p className="mt-5 text-muted">
              Un dashboard moderne avec analytics temps-réel.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Vues totales et activations AR",
                "Origine géographique des visiteurs",
                "Durée d'interaction par objet",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-[#00D4FF]" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-6 glow">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="h-5 w-5 text-[#6C63FF]" />
              <span className="font-semibold">Vue d&apos;ensemble</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Modèles", "12"],
                ["Vues", "3 847"],
                ["AR", "1 203"],
                ["Taux AR", "31%"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[rgba(108,99,255,0.06)] border border-[rgba(15,16,36,0.06)] p-4">
                  <p className="text-xs text-muted">{k}</p>
                  <p className="mt-1 text-2xl font-bold gradient-text">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-32 rounded-xl bg-gradient-to-tr from-[#6C63FF]/20 to-[#00D4FF]/20 flex items-end gap-1 p-3">
              {[40, 65, 50, 80, 55, 90, 75, 95, 70, 85, 60, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-[#6C63FF] to-[#00D4FF]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-bg-2 border-y border-[rgba(15,16,36,0.08)]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-3xl md:text-5xl font-bold text-center">Tarifs simples</h2>
          <p className="mt-4 text-center text-muted">Commence gratuitement, paie quand tu grandis.</p>
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {[
              { name: "Free", price: "0€", desc: "Pour commencer", features: ["5 modèles", "500 vues/mois", "Lien ScanAR"], cta: "Commencer" },
              { name: "Pro", price: "19€", desc: "Pour les pros", features: ["50 modèles", "10 000 vues/mois", "Lien personnalisable", "Stats avancées"], cta: "Choisir Pro", featured: true },
              { name: "Business", price: "Sur devis", desc: "Pour les équipes", features: ["Illimité", "Domaine custom", "API + SDK", "Support dédié"], cta: "Nous contacter" },
            ].map((p) => (
              <div
                key={p.name}
                className={`glass rounded-2xl p-7 relative ${p.featured ? "glow border-[#6C63FF]/40" : ""}`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] px-3 py-1 rounded-full">
                    Plus populaire
                  </span>
                )}
                <p className="text-sm text-muted">{p.desc}</p>
                <h3 className="text-2xl font-bold mt-1">{p.name}</h3>
                <p className="mt-4 text-4xl font-bold">{p.price}<span className="text-base text-muted font-normal">{p.name === "Pro" ? "/mois" : ""}</span></p>
                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="h-4 w-4 text-[#00D4FF] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-7 ${p.featured ? "btn-primary" : "btn-ghost"} w-full justify-center`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] opacity-90" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Ton premier objet 3D en ligne dans 10 minutes.
          </h2>
          <p className="mt-4 text-white/90">Gratuit. Sans carte bancaire.</p>
          <Link href="/signup" className="mt-8 inline-flex items-center gap-2 bg-white text-fg font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition">
            Créer mon compte gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(15,16,36,0.08)]">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded-md bg-gradient-to-br from-[#6C63FF] to-[#00D4FF]" />
            <span>ScanAR</span>
          </div>
          <p>© {new Date().getFullYear()} ScanAR. Tous droits réservés.</p>
        </div>
      </footer>
    </main>
  );
}
