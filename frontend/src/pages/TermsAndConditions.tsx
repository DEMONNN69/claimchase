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

export default function TermsAndConditions() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    legalAPI.getTerms()
      .then((res) => setDoc(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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

        {error && (
          <div className="text-center py-24 text-muted-foreground">
            <p className="text-lg font-medium">Terms & Conditions not available yet.</p>
            <p className="text-sm mt-2">Please check back soon.</p>
          </div>
        )}

        {doc && !loading && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">{doc.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Version {doc.version} &nbsp;·&nbsp; Effective{" "}
                {new Date(doc.effective_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="prose prose-sm max-w-none text-foreground">
              {doc.content_format === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: doc.content }} />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {doc.content}
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
          <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
