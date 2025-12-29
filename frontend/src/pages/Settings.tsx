import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [emailTracking, setEmailTracking] = useState(true);

  return (
    <div className="page-padding animate-fade-in md:max-w-2xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="card-base mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Account</p>
            <p className="text-sm text-muted-foreground">user@example.com</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card-base mb-6">
        <h2 className="font-semibold mb-4">Preferences</h2>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-tracking" className="font-medium">
              Email Tracking
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when your emails are opened
            </p>
          </div>
          <Switch
            id="email-tracking"
            checked={emailTracking}
            onCheckedChange={setEmailTracking}
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Danger Zone */}
      <div>
        <h2 className="font-semibold text-destructive mb-4">Danger Zone</h2>
        <Button variant="destructive" size="full" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Case
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          This action cannot be undone.
        </p>
      </div>
    </div>
  );
}
