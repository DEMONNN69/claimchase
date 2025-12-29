import { Outlet, useLocation } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { DesktopSidebar } from "./DesktopSidebar";

const pagesWithNav = ["/dashboard", "/guide", "/settings"];

export function AppLayout() {
  const location = useLocation();
  const showNav = pagesWithNav.includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - only on pages with nav */}
      {showNav && <DesktopSidebar />}

      {/* Main Content */}
      <div className={showNav ? "flex-1 md:max-w-none" : "w-full"}>
        <div className={`${showNav ? "max-w-md md:max-w-4xl" : "max-w-md"} mx-auto min-h-screen bg-background relative`}>
          <div className={showNav ? "pb-20 md:pb-0" : ""}>
            <Outlet />
          </div>
          {showNav && <BottomNavigation />}
        </div>
      </div>
    </div>
  );
}
