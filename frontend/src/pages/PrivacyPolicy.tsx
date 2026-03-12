import { useEffect, useState } from "react";
import { legalAPI } from "@/services/legal";
import { BrandLogo } from "@/components/BrandLogo";
import { Link } from "react-router-dom";

interface LegalDoc {
  title: string;
  content: string;
  content_format: "html" | "plain_text";
  version: string;
  effective_date: string;
  updated_at: string;
}

const FALLBACK_PRIVACY_DOC: LegalDoc = {
  title: "Privacy Policy",
  content_format: "html",
  version: "1.0",
  effective_date: "2026-03-12",
  updated_at: "2026-03-12",
  content: `
    <h2>1. Introduction</h2>
    <p>AmicusClaims ("we", "our", "us") helps users create, send, and track insurance grievance communications. This Privacy Policy explains how we collect, use, and protect your information.</p>

    <h2>2. Google User Data We Access</h2>
    <p>When you connect Gmail, we request only the scopes required for product functionality:</p>
    <ul>
      <li><strong>gmail.send</strong>: to send case-related emails from your connected Gmail account.</li>
      <li><strong>gmail.metadata</strong>: to read message metadata (labels, headers, thread IDs, timestamps) for status tracking.</li>
    </ul>
    <p>We do not use Gmail data for advertising or data sale.</p>

    <h2>3. How We Use Data</h2>
    <ul>
      <li>Send user-initiated legal and grievance communications.</li>
      <li>Track email workflow status such as sent, reply received, and thread linkage.</li>
      <li>Provide dashboard updates related to your cases.</li>
    </ul>

    <h2>4. Storage and Security</h2>
    <p>OAuth tokens and related metadata are stored securely with access controls. We retain data only as needed for service operation, legal obligations, and user-requested history.</p>

    <h2>5. Sharing</h2>
    <p>We do not sell Google user data. Data is shared only with service providers required to operate the platform, under confidentiality and security obligations.</p>

    <h2>6. User Controls</h2>
    <ul>
      <li>You can disconnect Gmail at any time from your account settings.</li>
      <li>You can request account deletion and data removal, subject to legal retention requirements.</li>
    </ul>

    <h2>7. Contact</h2>
    <p>For privacy questions, contact us at support@amicusclaims.ai.</p>
  `,
};

export default function PrivacyPolicy() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    legalAPI.getPrivacy()
      .then((res) => setDoc(res.data))
        .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

      const displayDoc = doc ?? FALLBACK_PRIVACY_DOC;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <BrandLogo size="md" />
          </Link>
          <Link to="/signup" className="text-sm text-primary hover:underline font-medium">
            ← Back to Sign Up
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2 mt-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded" />
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <>
            {error && (
              <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
                Live legal content is temporarily unavailable. Showing the latest public policy text.
              </div>
            )}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">{displayDoc.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Version {displayDoc.version} &nbsp;·&nbsp; Effective{" "}
                {new Date(displayDoc.effective_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="prose prose-sm max-w-none text-foreground">
              {displayDoc.content_format === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: displayDoc.content }} />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {displayDoc.content}
                </pre>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AmicusClaims. All rights reserved.
          &nbsp;·&nbsp;
          <Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link>
        </div>
      </footer>
    </div>
  );
}
