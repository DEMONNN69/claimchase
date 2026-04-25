import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import { authAPI } from "@/services/auth";

const GoogleCallback = () => {
  const [status, setStatus] = useState<"sending" | "done" | "error">("sending");
  const [message, setMessage] = useState("Finishing Google sign-in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMessage("Google sign-in was cancelled or denied.");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Missing authorization code in redirect.");
      return;
    }

    const isRedirectFlow = !window.opener || window.opener.closed;

    if (isRedirectFlow) {
      // Mobile redirect flow: call API directly, store token, redirect
      authAPI.googleCallback(code)
        .then((response) => {
          const { token, user: userData } = response.data;
          localStorage.setItem('authToken', token);
          localStorage.setItem('user', JSON.stringify(userData));
          sessionStorage.removeItem('google_auth_redirect');
          setStatus("done");
          setMessage("Signed in! Redirecting...");

          if (userData?.role === 'medical_reviewer') {
            window.location.href = '/reviewer';
          } else if (userData?.is_expert) {
            window.location.href = '/expert';
          } else {
            window.location.href = '/dashboard';
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Google sign-in failed. Please try again.");
        });
      return;
    }

    // Desktop popup flow: postMessage back to opener
    try {
      window.opener.postMessage(
        { type: "google-auth-success", code },
        "*"
      );
      setStatus("done");
      setMessage("Signed in! You can close this tab.");
      setTimeout(() => window.close(), 800);
    } catch (err) {
      setStatus("error");
      setMessage("Unable to send authorization code to the app.");
      console.error("Google callback error", err);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3 text-center">
        {status === "sending" && (
          <Loader2 className="mx-auto h-10 w-10 text-green-600 animate-spin" />
        )}
        {status === "done" && (
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        )}
        {status === "error" && (
          <TriangleAlert className="mx-auto h-10 w-10 text-amber-500" />
        )}
        <h1 className="text-lg font-semibold text-gray-900">Google Sign-In</h1>
        <p className="text-sm text-gray-700">{message}</p>
        {status === "error" && (
          <p className="text-xs text-gray-500">
            Close this tab and try signing in again.
          </p>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
