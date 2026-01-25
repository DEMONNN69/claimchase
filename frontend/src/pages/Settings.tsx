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
    <div className="p-5 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user?.email || "User"}</p>
                <p className="text-sm text-muted-foreground">Free Plan</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </CardContent>
        </Card>

        {/* Gmail Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectGmail
              gmailEmail={gmailEmail || user?.gmail_email}
              gmailConnected={gmailConnected || user?.gmail_connected}
              onConnectSuccess={handleGmailConnectSuccess}
              onDisconnectSuccess={handleGmailDisconnectSuccess}
            />
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label className="font-medium">Email Tracking</Label>
                  <p className="text-xs text-muted-foreground">Get notified when emails are opened</p>
                </div>
              </div>
              <Switch
                checked={emailTracking}
                onCheckedChange={setEmailTracking}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates on your phone</p>
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-11 justify-start gap-3"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <Button 
              variant="destructive" 
              className="w-full h-11 justify-start gap-3"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Deleting your account is permanent and cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
