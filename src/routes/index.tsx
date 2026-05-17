import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Globe2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Frobex — Invest in Stocks, Crypto & Commodities" },
      { name: "description", content: "Frobex is a modern broker platform. Trade stocks, crypto, and commodities with a clean dashboard and real-time portfolio tracking." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-28">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Markets open — trade now
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Invest with <span className="text-gradient">clarity</span>.
              <br />Built for the modern trader.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Frobex gives you a unified broker experience: stocks, crypto, and commodities — all
              tracked in a beautiful, real-time portfolio dashboard.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-hero shadow-glow hover:opacity-95">
                <Link to="/auth">Open free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline"><Link to="/market">Browse market</Link></Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, title: "Live portfolio", desc: "Track balance, P&L, and holdings in real time." },
              { icon: Globe2, title: "Wide market", desc: "Stocks, crypto, ETFs, and commodities in one place." },
              { icon: Zap, title: "Instant execution", desc: "Trade with one click. No friction, ever." },
              { icon: ShieldCheck, title: "Bank-grade security", desc: "Encrypted accounts, secure session handling." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center shadow-elegant">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">Start investing in minutes</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">No paperwork. No hidden fees. Just a clean broker built for you.</p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/auth">Create your account <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Frobex. All rights reserved.
      </footer>
    </div>
  );
}
