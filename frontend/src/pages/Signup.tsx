import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/auth";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { BrandLogo } from "@/components/BrandLogo";

export default function Signup() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { signup, googleLogin, isLoading, error } = useAuth();
  const allowedGoogleMessageOrigins = new Set([
    window.location.origin,
    'https://www.amicusclaims.ai',
    'https://amicusclaims.ai',
  ]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error(t('auth:validation.fill_all_fields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth:validation.passwords_dont_match'));
      return;
    }

    if (formData.password.length < 8) {
      toast.error(t('auth:validation.password_min_length'));
      return;
    }

    if (!formData.termsAccepted) {
      toast.error('You must accept the Terms & Conditions to create an account.');
      return;
    }

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        terms_accepted: true,
      });
      toast.success(t('auth:validation.account_created'));
      navigate("/onboarding");
    } catch (err: any) {
      toast.error(error || t('auth:validation.signup_failed'));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-6 py-10 lg:p-12 lg:min-h-screen flex flex-col justify-between">
        <div>
          <BrandLogo size="lg" inverted />
        </div>
        <div className="text-white my-8 lg:my-0">
          <h2 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-4">
            {t('auth:signup.tagline')}<br className="hidden lg:block"/>
          </h2>
          <p className="text-white/80 text-sm lg:text-lg">{t('auth:signup.description')}</p>
        </div>
        <p className="text-white/60 text-xs hidden lg:block">© 2026 AmicusClaims</p>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardContent className="p-0 lg:p-8">
            <h2 className="text-2xl font-semibold mb-1">{t('auth:signup.title')}</h2>
            <p className="text-muted-foreground text-sm mb-8">{t('auth:signup.subtitle')}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email">{t('auth:signup.email_label')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@gmail.com"
                  className="mt-2 h-11"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password">{t('auth:signup.password_label')}</Label>
                <PasswordInput 
                  id="password" 
                  placeholder="••••••••"
                  className="mt-2 h-11"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">{t('auth:signup.confirm_password_label')}</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  className="mt-2 h-11"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  disabled={isLoading}
                />
                {formData.confirmPassword && (
                  <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? "text-green-600" : "text-destructive"}`}>
                    {formData.password === formData.confirmPassword ? "✓ Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, termsAccepted: checked === true }))
                  }
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    Terms &amp; Conditions
                  </Link>{" "}and{" "}
                  <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? t('auth:signup.creating_account') : t('auth:signup.signup_button')}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background lg:bg-card px-4 text-sm text-muted-foreground">or</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11"
              onClick={async () => {
                let handleMessage: ((event: MessageEvent) => Promise<void>) | null = null;
                try {
                  setGoogleLoading(true);
                  handleMessage = async (event: MessageEvent) => {
                    if (!allowedGoogleMessageOrigins.has(event.origin)) return;
                    if (event.data?.type !== 'google-auth-success') return;
                    window.removeEventListener('message', handleMessage as EventListener);
                    try {
                      await googleLogin(event.data.code);
                      toast.success('Account created with Google!');
                      navigate('/onboarding');
                    } catch {
                      toast.error('Google sign-up failed. Please try again.');
                    }
                  };
                  window.addEventListener('message', handleMessage as EventListener);

                  const { data } = await authAPI.googleConnect();
                  const popup = window.open(
                    data.authorization_url,
                    'google-signup',
                    'width=500,height=620,left=400,top=100'
                  );
                  if (!popup) {
                    window.removeEventListener('message', handleMessage as EventListener);
                    toast.error('Please allow popups for this site');
                    return;
                  }
                } catch {
                  if (handleMessage) {
                    window.removeEventListener('message', handleMessage as EventListener);
                  }
                  toast.error('Could not start Google sign-in');
                } finally {
                  setGoogleLoading(false);
                }
              }}
              disabled={isLoading || googleLoading}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth:signup.google_signup')}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-3">
              By continuing with Google you agree to our{" "}
              <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms</Link>
              {" "}&amp;{" "}
              <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
            </p>

            <p className="text-center text-sm text-muted-foreground mt-8">
              {t('auth:signup.have_account')}{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                {t('auth:signup.signin_link')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
