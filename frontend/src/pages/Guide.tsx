import { ExternalLink, FileText, Shield, User, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationBell } from "@/components/NotificationBell";
const iconMap = {
  rejection: FileText,
  policy: Shield,
  kyc: User,
};

export default function Guide() {
  const { t } = useTranslation('guide');
  const navigate = useNavigate();
  
  const checklistItems = [
    { id: "rejection", icon: iconMap.rejection },
    { id: "policy", icon: iconMap.policy },
    { id: "kyc", icon: iconMap.kyc },
  ];

  return (
    <div className="min-h-screen">
      {/* Mobile Navbar - Only visible on mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate("/settings")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 lg:p-8 animate-fade-in">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle')}
          </p>
        </div>

        {/* Info Card */}
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 border-l-4 border-l-primary p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded">Pro Tip</span>
            </div>
            <p className="text-sm text-foreground">{t('pro_tip_text')}</p>
          </div>
        </div>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('required_documents')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible defaultValue="rejection" className="space-y-2">
              {checklistItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm text-left">{t(`documents.${item.id}.title`)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <p className="text-muted-foreground text-sm mb-3">
                      {t(`documents.${item.id}.description`)}
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('tips_label')}</p>
                      <ul className="space-y-1.5">
                        {(t(`documents.${item.id}.tips`, { returnObjects: true }) as string[]).map((tip, index) => (
                          <li key={index} className="text-xs flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* External Link */}
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full h-11 gap-2"
            onClick={() => window.open("https://www.cioins.co.in/ombudsman", "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            {t('find_ombudsman')}
          </Button>
        </div>
      </div>
    </div>
  );
}
