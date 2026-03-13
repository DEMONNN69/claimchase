import { Outlet } from "react-router-dom";
import { ReviewerHeader, ReviewerBottomNav } from "./ReviewerNavigation";

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

export function ReviewerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingBottom: "36px" }}>
      <ReviewerHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <ReviewerBottomNav />
      <LegalFooter />
    </div>
  );
}
