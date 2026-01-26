import { Home, BookOpen, Settings, Shield, AlertTriangle, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function DesktopSidebar() {
  const { t } = useTranslation('common');
  
  const navItems = [
    { to: "/dashboard", icon: Home, label: t('navigation.home') },
    { to: "/cases", icon: FileText, label: t('navigation.my_cases') },
    { to: "/disputes", icon: AlertTriangle, label: t('navigation.consumer_disputes') },
    { to: "/guide", icon: BookOpen, label: t('navigation.guide') },
    { to: "/settings", icon: Settings, label: t('navigation.settings') },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-lg">{t('app_name')}</span>
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
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-center">
          <LanguageSwitcher variant="compact" />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Not legal advice. Guidance only.
        </p>
      </div>
    </aside>
  );
}
