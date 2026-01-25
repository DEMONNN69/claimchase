import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Trash2, Bell, Mail, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ConnectGmail } from "@/components/ConnectGmail";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function Settings() {
  const [emailTracking, setEmailTracking] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string>();
  const { user, logout, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize Gmail state from user data
  useEffect(() => {
    if (user?.gmail_connected) {
      setGmailConnected(true);
      setGmailEmail(user.gmail_email);
    }
  }, [user]);

  // Handle OAuth redirect from backend
  useEffect(() => {
    const gmailConnectedParam = searchParams.get('gmail_connected');
    const gmailEmailParam = searchParams.get('gmail_email');
    const gmailError = searchParams.get('gmail_error');

    if (gmailConnectedParam === 'true' && gmailEmailParam) {
      setGmailConnected(true);
      setGmailEmail(gmailEmailParam);
      toast.success(`Gmail connected: ${gmailEmailParam}`);
      // Refresh user data
      refreshUser?.();
      // Clear query params
      setSearchParams({});
    } else if (gmailError) {
      const errorMessages: Record<string, string> = {
        no_code: 'No authorization code received',
        no_token: 'Authentication required',
        exchange_failed: 'Failed to exchange authorization code',
        no_email: 'Failed to fetch Gmail address',
        invalid_token: 'Invalid authentication token',
        unknown: 'An error occurred connecting Gmail'
      };
      toast.error(errorMessages[gmailError] || 'Gmail connection failed');
      // Clear query params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refreshUser]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  const handleGmailConnectSuccess = (email: string) => {
    setGmailConnected(true);
    setGmailEmail(email);
  };

  const handleGmailDisconnectSuccess = () => {
    setGmailConnected(false);
    setGmailEmail(undefined);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Mobile Navbar - Only visible on mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 mb-6 w-full">
        <div className="flex items-center justify-between min-w-0">
          <h1 className="text-lg font-semibold text-primary truncate">ClaimChase</h1>
          <div className="text-sm text-muted-foreground truncate">
            Settings
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 animate-fade-in w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6 min-w-0 w-full">
          <h1 className="text-xl lg:text-2xl font-bold break-words">Settings</h1>
        </div>

        <div className="space-y-6 w-full">
          {/* Profile Card */}
          <Card className="min-w-0 w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full min-w-0">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <p className="font-semibold break-all truncate">{user?.email || "User"}</p>
                  <p className="text-sm text-muted-foreground">Free Plan</p>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto flex-shrink-0">Edit</Button>
              </div>
            </CardContent>
          </Card>

          {/* Gmail Integration */}
          <Card className="min-w-0 w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Email Integration</CardTitle>
            </CardHeader>
            <CardContent className="w-full overflow-hidden">
              <div className="w-full overflow-hidden">
                <ConnectGmail
                  gmailEmail={gmailEmail || user?.gmail_email}
                  gmailConnected={gmailConnected || user?.gmail_connected}
                  onConnectSuccess={handleGmailConnectSuccess}
                  onDisconnectSuccess={handleGmailDisconnectSuccess}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="min-w-0 w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 w-full">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="font-medium block">Email Tracking</Label>
                    <p className="text-xs text-muted-foreground break-words">Get notified when emails are opened</p>
                  </div>
                </div>
                <Switch
                  checked={emailTracking}
                  onCheckedChange={setEmailTracking}
                  className="flex-shrink-0"
                />
              </div>
              
              <div className="flex items-start justify-between gap-4 w-full">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="font-medium block">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground break-words">Receive updates on your phone</p>
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  className="flex-shrink-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="min-w-0 w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full h-11 justify-start gap-3 min-w-0"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Sign Out</span>
              </Button>
              <Button 
                variant="destructive" 
                className="w-full h-11 justify-start gap-3 min-w-0"
              >
                <Trash2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Delete Account</span>
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-2 break-words">
                Deleting your account is permanent and cannot be undone.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
