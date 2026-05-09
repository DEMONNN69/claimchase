import { useState } from "react";
import { Home, BookOpen, Settings, AlertTriangle, FileText, LogOut, Menu, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';

export default function MobileSidebar() {
  const { t } = useTranslation('common');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/dashboard", icon: Home, label: t('navigation.home') },
    { to: "/cases", icon: FileText, label: t('navigation.my_cases') },
    { to: "/disputes", icon: AlertTriangle, label: t('navigation.consumer_disputes') },
    { to: "/guide", icon: BookOpen, label: t('navigation.guide') },
    { to: "/settings", icon: Settings, label: t('navigation.settings') },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setOpen(false);
      navigate('/login');
    }
  };

  return (
    <>
      {/* Toggle button - visible on small screens only */}
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <aside className="relative w-64 max-w-full bg-card border-r border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">{t('app_name') || 'ClaimChase'}</div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg font-medium",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}

                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{t('navigation.logout', { defaultValue: 'Sign out' })}</span>
                  </button>
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
