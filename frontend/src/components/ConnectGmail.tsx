import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, LogOut, AlertCircle } from "lucide-react";
import { gmailAPI } from "@/services/gmail";
import { toast } from "sonner";

interface ConnectGmailProps {
  gmailEmail?: string;
  gmailConnected?: boolean;
  onConnectSuccess?: (email: string) => void;
  onDisconnectSuccess?: () => void;
}

export function ConnectGmail({
  gmailEmail,
  gmailConnected = false,
  onConnectSuccess,
  onDisconnectSuccess,
}: ConnectGmailProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setIsLoading(true);

      // Get authorization URL
      const response = await gmailAPI.getAuthorizationUrl();
      const authUrl = response.data.authorization_url;

      // Open authorization URL in the same window (will redirect back after auth)
      window.location.href = authUrl;

    } catch (error: any) {
      console.error("Error getting authorization URL:", error);
      toast.error("Failed to start Gmail connection");
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);

      const response = await gmailAPI.disconnect();

      if (response.data.success) {
        toast.success("Gmail account disconnected");
        onDisconnectSuccess?.();
      }
    } catch (error: any) {
      console.error("Error disconnecting Gmail:", error);
      toast.error("Failed to disconnect Gmail");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full overflow-hidden">
      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200 min-w-0">
        <Mail className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900">Gmail Integration</p>
          <p className="text-sm text-green-800 mt-1 break-words">
            Connect your Gmail account to automatically send grievance emails
            to insurance companies.
          </p>
        </div>
      </div>

      {gmailConnected && gmailEmail ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900">Connected</p>
            <p className="text-sm text-green-800 break-all">{gmailEmail}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="border-green-200 hover:bg-red-50 flex-shrink-0 w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Disconnect</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Not Connected</p>
            <p className="text-sm text-gray-600 break-words">
              Connect your Gmail to send emails automatically
            </p>
          </div>
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="gap-2 flex-shrink-0 w-full sm:w-auto"
          >
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{isLoading ? "Connecting..." : "Connect Gmail"}</span>
          </Button>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 min-w-0">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 min-w-0 flex-1">
          <p className="font-semibold mb-1">Privacy Note</p>
          <p className="break-words">
            We only request permission to send emails and read your inbox for
            replies. Your Gmail account remains secure and only your authorized
            grievance emails will be sent.
          </p>
        </div>
      </div>
    </div>
  );
}
