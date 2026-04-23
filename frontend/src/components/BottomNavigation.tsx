import { Home, BookOpen, AlertTriangle, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const { t } = useTranslation('common');

  const navItems = [
    { to: "/dashboard", icon: Home, label: t('navigation.home') },
    { to: "/cases", icon: FileText, label: t('navigation.cases') },
    { to: "/disputes", icon: AlertTriangle, label: "Disputes" },
    { to: "/guide", icon: BookOpen, label: t('navigation.guide') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around py-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-xl transition-all",
                  isActive ? "bg-primary/10" : ""
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
