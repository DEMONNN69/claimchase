import { Outlet } from "react-router-dom";
import { ReviewerHeader, ReviewerBottomNav } from "./ReviewerNavigation";

export function ReviewerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ReviewerHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <ReviewerBottomNav />
    </div>
  );
}
