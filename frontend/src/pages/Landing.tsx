import { Shield, FileText, Mail, Scale, ArrowRight, CheckCircle2, Users, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation('landing');

  const services = [
    {
      icon: FileText,
      title: t('services.draft_grievance.title'),
      description: t('services.draft_grievance.description'),
      color: "bg-green-500/10 text-green-600",
    },
    {
      icon: Mail,
      title: t('services.send_track.title'),
      description: t('services.send_track.description'),
      color: "bg-green-500/10 text-green-600",
    },
    {
      icon: Scale,
      title: t('services.ombudsman.title'),
      description: t('services.ombudsman.description'),
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      icon: Users,
      title: t('services.expert_help.title'),
      description: t('services.expert_help.description'),
      color: "bg-green-100/10 text-green-700",
    },
  ];

  const stats = [
    { value: "10K+", label: t('stats.claims_resolved') },
    { value: "₹50Cr+", label: t('stats.amount_recovered') },
    { value: "4.8★", label: t('stats.user_rating') },
  ];

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <BrandLogo size="md" />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href="/privacy-policy.html"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Privacy Policy
          </a>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">{t('header.login')}</Link>
          </Button>
          <Button size="sm" onClick={() => navigate("/login")}>
            {t('header.get_started')}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full px-6 py-12 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left - Text */}
            <div className="flex-1 text-center lg:text-left">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('hero.badge')}
              </Badge>
              <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-muted-foreground text-base lg:text-lg mb-8 max-w-md mx-auto lg:mx-0">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button size="lg" className="h-12 px-8" onClick={() => navigate("/login")}>
                  {t('hero.start_claim')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                  {t('hero.how_works')}
                </Button>
              </div>
            </div>

            {/* Right - Visual */}
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="relative">
                <div className="bg-gradient-to-br from-primary to-primary/60 rounded-3xl p-8 lg:p-12">
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{t('hero.claim_approved')}</p>
                        <p className="text-sm text-white/70">{t('hero.amount_recovered', { amount: '2,50,000' })}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-white/20 rounded-full w-full" />
                      <div className="h-2 bg-white/20 rounded-full w-3/4" />
                      <div className="h-2 bg-white/20 rounded-full w-1/2" />
                    </div>
                  </div>
                </div>
                {/* Floating stats */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 hidden lg:block">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-semibold text-sm">{t('hero.avg_resolution')}</p>
                      <p className="text-xs text-muted-foreground">{t('hero.resolution_time')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="w-full px-6 py-8 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl lg:text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="w-full px-6 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">{t('services.title')}</h2>
            <p className="text-muted-foreground">{t('services.subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => (
              <Card 
                key={service.title} 
                className="group cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary/20"
              >
                <CardContent className="p-5 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-xl ${service.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{service.title}</h3>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full px-6 py-12 lg:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">{t('how_it_works.title')}</h2>
            <p className="text-muted-foreground">{t('how_it_works.subtitle')}</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            {[
              { step: "1", title: t('how_it_works.step1.title'), desc: t('how_it_works.step1.description') },
              { step: "2", title: t('how_it_works.step2.title'), desc: t('how_it_works.step2.description') },
              { step: "3", title: t('how_it_works.step3.title'), desc: t('how_it_works.step3.description') },
            ].map((item, index) => (
              <div key={item.step} className="flex-1 relative">
                <div className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                {index < 2 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 text-muted-foreground/30 h-6 w-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Data Use Transparency */}
      <section className="w-full px-6 py-10 bg-white border-y">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl lg:text-2xl font-bold mb-3">How we use Google data</h2>
          <p className="text-sm lg:text-base text-muted-foreground mb-4">
            AmicusClaims connects to your Gmail only after you authorize access. We use Gmail to send
            case-related emails on your behalf so your case dashboard can track communication status.
          </p>
          <p className="text-sm lg:text-base text-muted-foreground">
            We do not use Google user data for advertising or sale.
            &nbsp;
            <a href="https://amicusclaims.ai/privacy-policy.html" className="text-primary hover:underline">Privacy Policy</a>
            &nbsp;|&nbsp;
            <a href="https://amicusclaims.ai/terms.html" className="text-primary hover:underline">Terms &amp; Conditions</a>
          </p>
        </div>
      </section>

      {/* AI Transparency */}
      <section id="ai-transparency" className="w-full px-6 py-10 bg-muted/20 border-b">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl lg:text-2xl font-bold">AI Transparency</h2>
          </div>
          <p className="text-sm lg:text-base text-muted-foreground mb-4">
            AmicusClaims uses AI-powered services to help you draft insurance grievance letters and consumer
            complaints. These features are powered by third-party large language model providers, including
            <strong> OpenAI</strong> and <strong>Google Gemini</strong>, depending on the task.
          </p>
          <p className="text-sm lg:text-base text-muted-foreground">
            AI-generated content is provided as a draft for your review. You remain in full control — nothing
            is submitted on your behalf without your explicit confirmation. AI services do not have access to
            your Gmail account or personal documents.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-6 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('cta.subtitle')}</p>
          <Button size="lg" className="h-12 px-10" onClick={() => navigate("/login")}>
            {t('cta.get_started')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="text-muted-foreground text-sm">{t('footer.tagline')}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://amicusclaims.ai/privacy-policy.html" className="hover:underline hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="https://amicusclaims.ai/terms.html" className="hover:underline hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </a>
            <a href="#ai-transparency" className="hover:underline hover:text-foreground transition-colors">
              AI Transparency
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}
