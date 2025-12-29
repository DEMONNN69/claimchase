import { Home, BookOpen, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/guide", icon: BookOpen, label: "Guide" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-lg">ClaimChase</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Not legal advice. Guidance only.
        </p>
      </div>
    </aside>
  );
}
