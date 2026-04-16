import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  Tag,
  BarChart3,
  Menu,
  LogOut,
  HandCoins,
} from "lucide-react";
import { useState } from "react";
import spendlyLogo from "@/assets/spendly-logo.png";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: TrendingUp },
  { href: "/expenses", label: "Expenses", icon: TrendingDown },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/savings", label: "Savings", icon: Target },
  { href: "/loans", label: "Loans", icon: HandCoins },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img
              src={spendlyLogo}
              alt="Spendly logo"
              className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-sm"
            />
            <div>
              <div className="font-bold text-sidebar-foreground text-base leading-none tracking-tight">
                Spendly
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-none">
                spending made friendly
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">All amounts in BDT (৳)</p>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border flex items-center gap-3 px-4 h-14 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <img src={spendlyLogo} alt="Spendly" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-bold text-sm tracking-tight">Spendly</span>
          {user && (
            <button
              onClick={logout}
              className="ml-auto p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
