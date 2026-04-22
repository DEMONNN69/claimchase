import { useEffect, useState } from "react";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";

const GmailCallback = () => {
  const [status, setStatus] = useState<"sending" | "done" | "error">("sending");
  const [message, setMessage] = useState("Finishing Gmail connection...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setStatus("error");
      setMessage("Missing authorization code in redirect.");
      return;
    }

    try {
      // Send the auth code back to the opener window so the main app can finish the flow
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "gmail-auth-success", code }, window.location.origin);
        setStatus("done");
        setMessage("Code received. You can close this tab.");
        // Give the opener a moment to receive the message before closing
        setTimeout(() => window.close(), 800);
      } else {
        setStatus("error");
        setMessage("No parent window found. Please retry from the app.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Unable to send authorization code to the app.");
      console.error("Gmail callback error", err);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3 text-center">
        {status === "sending" && <Loader2 className="mx-auto h-10 w-10 text-green-600 animate-spin" />}
        {status === "done" && <MailCheck className="mx-auto h-10 w-10 text-green-600" />}
        {status === "error" && <TriangleAlert className="mx-auto h-10 w-10 text-amber-500" />}
        <h1 className="text-lg font-semibold text-gray-900">Gmail Authorization</h1>
        <p className="text-sm text-gray-700">{message}</p>
        {status === "error" && (
          <p className="text-xs text-gray-500">
            Close this tab and start the Gmail connection again from Settings.
          </p>
        )}
      </div>
    </div>
  );
};

export default GmailCallback;
