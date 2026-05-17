import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { TrendingUp, LogOut } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">frobex</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium bg-accent text-foreground" }}>Dashboard</Link>
            <Link to="/market" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium bg-accent text-foreground" }}>Market</Link>
            <Link to="/transactions" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium bg-accent text-foreground" }}>Activity</Link>
            <Link to="/support" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium bg-accent text-foreground" }}>Support</Link>
            <Button variant="ghost" size="sm" className="ml-2" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
          </nav>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/support" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Support</Link>
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm"><Link to="/auth">Get started</Link></Button>
          </div>
        )}
      </div>
    </header>
  );
}
