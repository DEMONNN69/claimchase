import { Outlet, useLocation } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { DesktopSidebar } from "./DesktopSidebar";

const pagesWithNav = ["/dashboard", "/cases", "/guide", "/settings", "/disputes"];

function LegalFooter() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        width: "100%",
        textAlign: "center",
        padding: "8px 16px",
        fontSize: "11px",
        color: "#9ca3af",
        borderTop: "1px solid #e5e7eb",
        backgroundColor: "rgba(249,250,251,0.97)",
        backdropFilter: "blur(4px)",
      }}
    >
      <a
        href="/privacy-policy.html"
        style={{ color: "#2563eb", textDecoration: "none", marginRight: "16px" }}
      >
        Privacy Policy
      </a>
      <a
        href="/terms.html"
        style={{ color: "#2563eb", textDecoration: "none" }}
      >
        Terms &amp; Conditions
      </a>
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();
  const showNav = pagesWithNav.includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-background flex-col">
      <div className="flex flex-1">
        {/* Desktop Sidebar - only on pages with nav */}
        {showNav && <DesktopSidebar />}

        {/* Main Content */}
        <div className={showNav ? "flex-1 md:max-w-none" : "w-full"}>
          {showNav ? (
            <div className="max-w-md md:max-w-4xl mx-auto min-h-screen bg-background relative">
              <div className="pb-20 md:pb-0">
                <Outlet />
              </div>
              <BottomNavigation />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>

      {/* Persistent legal footer — always rendered inside the React tree */}
      <LegalFooter />
    </div>
  );
}
