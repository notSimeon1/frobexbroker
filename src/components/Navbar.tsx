import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, LogOut, Menu, X, Shield, LayoutDashboard, LineChart, Store,
  ArrowDownToLine, ArrowUpFromLine, Clock, Activity, Users, Bot, Sparkles,
  Headphones, Megaphone, Mail, User, ChevronDown, HelpCircle, Gift, Play, ShoppingCart, MinusSquare, Zap, Cpu, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "./NotificationBell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: ReactNode; badge?: { label: string; tone: "gold" | "green" | "purple" | "blue" } };

const OWNER_EMAIL = "simonosawaru255@gmail.com";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    if (user.email?.toLowerCase() === OWNER_EMAIL) { setIsAdmin(true); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const sections: { title: string; items: NavItem[] }[] = [
    { title: "SHORTCUT", items: [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { to: "/support", label: "Help", icon: <HelpCircle className="h-4 w-4" /> },
      { to: "/trade?mode=demo", label: "Demo Trading", icon: <Play className="h-4 w-4" /> },
      { to: "/referrals", label: "Referral", icon: <Gift className="h-4 w-4" /> },
      { to: "/trade", label: "Trade / Chart", icon: <LineChart className="h-4 w-4" /> },
    ]},
    { title: "MANAGE ASSETS", items: [
      { to: "/market", label: "Buy / Sell", icon: <ShoppingCart className="h-4 w-4" /> },
      { to: "/deposit", label: "Deposit", icon: <ArrowDownToLine className="h-4 w-4" /> },
      { to: "/withdraw", label: "Withdraw", icon: <ArrowUpFromLine className="h-4 w-4" /> },
    ]},
    { title: "TRADE", items: [
      { to: "/trade?mode=demo", label: "Demo Trading", icon: <Play className="h-4 w-4" /> },
      { to: "/trade", label: "Live Trading", icon: <Zap className="h-4 w-4" />, badge: { label: "Live", tone: "green" } },
      { to: "/copy-trading", label: "Copy Trading", icon: <Users className="h-4 w-4" />, badge: { label: "Pro", tone: "purple" } },
      { to: "/ai-bots", label: "AI Trading Bots", icon: <Bot className="h-4 w-4" />, badge: { label: "AI", tone: "blue" } },
      { to: "/pre-market", label: "Pre Market", icon: <Layers className="h-4 w-4" /> },
    ]},
    { title: "MARKET INTELLIGENCE", items: [
      { to: "/signals", label: "Signals", icon: <Sparkles className="h-4 w-4" />, badge: { label: "3-Day Free", tone: "gold" } },
    ]},
    { title: "HELP AND ACCOUNT", items: [
      { to: "/support", label: "Support / Live Chat", icon: <Headphones className="h-4 w-4" />, badge: { label: "Online", tone: "green" } },
      { to: "/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
      { to: "/support", label: "Contact Us", icon: <Mail className="h-4 w-4" /> },
      ...(isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: <Shield className="h-4 w-4" /> } as NavItem, { to: "/admin-ops", label: "Admin Ops", icon: <Cpu className="h-4 w-4" /> } as NavItem] : []),
    ]},
  ];

  const toneBg: Record<string, string> = {
    gold: "bg-primary/20 text-primary border-primary/40",
    green: "bg-success/20 text-success border-success/40",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Top-LEFT hamburger */}
          <div className="flex items-center gap-2">
            {user && (
              <button onClick={() => setOpen(true)} aria-label="Menu" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight">frobex</span>
            </Link>
          </div>

          {/* Top-right — notif bell + user dropdown (preserved) */}
          {user ? (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 hover:bg-accent">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-hero text-[10px] font-bold text-primary-foreground">
                      {(user.email?.[0] ?? "U").toUpperCase()}
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/kyc" })}><Shield className="mr-2 h-4 w-4" />KYC Verification</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/referrals" })}><Gift className="mr-2 h-4 w-4" />Referrals</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/transactions" })}><Clock className="mr-2 h-4 w-4" />Recent Activity</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm"><Link to="/auth" search={{ next: "" }}>Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/auth" search={{ next: "" }}>Get started</Link></Button>
            </div>
          )}
        </div>
      </header>

      {/* Side drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed left-0 top-0 z-50 flex h-full w-[320px] max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-card shadow-elegant">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
                    <TrendingUp className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-base font-bold tracking-tight">frobex</span>
                </div>
                <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex-1 space-y-5 px-3 py-4">
                {sections.map((s) => (
                  <div key={s.title}>
                    <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.title}</div>
                    <ul className="space-y-0.5">
                      {s.items.map((i) => (
                        <li key={i.to + i.label}>
                          <Link to={i.to as any} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-accent">
                            <span className="flex items-center gap-2.5">{i.icon}<span>{i.label}</span></span>
                            {i.badge && (
                              <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${toneBg[i.badge.tone]}`}>{i.badge.label}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <Button variant="ghost" className="w-full justify-start" onClick={async () => { await signOut(); setOpen(false); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </Button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
