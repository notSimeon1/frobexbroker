import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, LogOut, Menu, X, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const OWNER_EMAIL = "simonosawaru255@gmail.com";
  const isOwnerEmail = user?.email?.toLowerCase() === OWNER_EMAIL;

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    if (isOwnerEmail) { setIsAdmin(true); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user, isOwnerEmail]);

  const userLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/market", label: "Market" },
    { to: "/deposit", label: "Deposit" },
    { to: "/withdraw", label: "Withdraw" },
    { to: "/transactions", label: "Activity" },
    { to: "/support", label: "Support" },
  ] as const;

  const linkClass = "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors";
  const activeClass = "rounded-md px-3 py-2 text-sm font-medium bg-accent text-foreground";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <motion.div whileHover={{ rotate: 12, scale: 1.05 }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </motion.div>
          <span className="text-lg font-bold tracking-tight">frobex</span>
        </Link>

        {user ? (
          <>
            <nav className="hidden items-center gap-1 lg:flex">
              {userLinks.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass} activeProps={{ className: activeClass }}>{l.label}</Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className={linkClass} activeProps={{ className: activeClass }}>
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Admin</span>
                </Link>
              )}
              <Button variant="ghost" size="sm" className="ml-2" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </nav>
            <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/support" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Support</Link>
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm"><Link to="/auth">Get started</Link></Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {user && open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {userLinks.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass} activeProps={{ className: activeClass }} onClick={() => setOpen(false)}>{l.label}</Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className={linkClass} activeProps={{ className: activeClass }} onClick={() => setOpen(false)}>Admin</Link>
              )}
              <Button variant="ghost" size="sm" className="mt-1 justify-start" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
