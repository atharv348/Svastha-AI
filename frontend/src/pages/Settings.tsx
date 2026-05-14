import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings as SettingsIcon, User, Bell, Shield, Globe, Trash2, Save, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40">
              <CardTitle className="flex items-center gap-2">
                <User className="text-primary" size={20} />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details and public profile</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" placeholder="Enter your name" className="rounded-xl border-border/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="Enter email" className="rounded-xl border-border/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="Enter username" className="rounded-xl border-border/40" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Preferred Language</Label>
                  <Input id="language" placeholder="Enter language (e.g. English)" className="rounded-xl border-border/40" />
                </div>
              </div>
              <Button className="rounded-xl gradient-primary mt-4 px-8">
                <Save size={16} className="mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40">
              <CardTitle className="flex items-center gap-2">
                <Bell className="text-primary" size={20} />
                Notifications
              </CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Email Notifications</p>
                  <p className="text-xs text-muted-foreground font-medium">Receive weekly health summaries and reports</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">In-App Notifications</p>
                  <p className="text-xs text-muted-foreground font-medium">Alerts for AI diagnosis and meal reminders</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/40 shadow-xl overflow-hidden border-destructive/20">
            <CardHeader className="bg-destructive/5 border-b border-destructive/20">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="text-destructive" size={20} />
                Security & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Button variant="outline" className="w-full rounded-xl justify-start h-auto p-4 border-border/40">
                <div className="flex items-start gap-3">
                  <Globe className="text-muted-foreground mt-0.5" size={18} />
                  <div className="text-left">
                    <p className="text-sm font-bold">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground font-medium">View how your data is protected</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="w-full rounded-xl justify-start h-auto p-4 border-destructive/20 text-destructive hover:bg-destructive/5">
                <div className="flex items-start gap-3">
                  <Trash2 className="text-destructive mt-0.5" size={18} />
                  <div className="text-left">
                    <p className="text-sm font-bold">Delete Account</p>
                    <p className="text-xs text-muted-foreground font-medium">Permanently remove your health profile</p>
                  </div>
                </div>
              </Button>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                <div className="flex items-start gap-3">
                  <Info className="text-muted-foreground mt-0.5" size={18} />
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    All medical data is encrypted and HIPAA compliant. We never share your sensitive health information with third parties.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
