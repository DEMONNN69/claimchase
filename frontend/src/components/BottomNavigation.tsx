import { Home, BookOpen, Settings, AlertTriangle, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const { t } = useTranslation('common');
  
  const navItems = [
    { to: "/dashboard", icon: Home, label: t('navigation.home') },
    { to: "/cases", icon: FileText, label: t('navigation.cases') },
    { to: "/guide", icon: BookOpen, label: t('navigation.guide') },
    { to: "/settings", icon: Settings, label: t('navigation.settings') },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
