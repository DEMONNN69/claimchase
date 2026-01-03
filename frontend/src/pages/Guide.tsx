import { ExternalLink, FileText, Shield, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const checklistItems = [
  {
    id: "rejection",
    icon: FileText,
    title: "Rejection Letter",
    description: "The official letter from your insurer stating the reason for claim rejection.",
    tips: [
      "Request in writing if not received",
      "Keep both email and physical copies",
      "Note the date received",
    ],
  },
  {
    id: "policy",
    icon: Shield,
    title: "Policy Copy",
    description: "Your complete insurance policy document including terms and conditions.",
    tips: [
      "Check for latest version",
      "Highlight relevant clauses",
      "Keep endorsements attached",
    ],
  },
  {
    id: "kyc",
    icon: User,
    title: "KYC Documents",
    description: "Identity and address proof required for the Ombudsman complaint.",
    tips: [
      "Aadhaar or PAN card copy",
      "Recent passport photo",
      "Address proof if different",
    ],
  },
];

export default function Guide() {
  return (
    <div className="p-5 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Ombudsman Guide</h1>
        <p className="text-muted-foreground text-sm">
          Documents needed for your Ombudsman complaint
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Pro Tip</p>
            <p className="text-xs text-muted-foreground">Keep all documents in PDF format for easy submission.</p>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Documents</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion type="single" collapsible className="space-y-2">
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
                    <span className="font-medium text-sm text-left">{item.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-muted-foreground text-sm mb-3">
                    {item.description}
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Tips</p>
                    <ul className="space-y-1.5">
                      {item.tips.map((tip, index) => (
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
          Find Ombudsman Address
        </Button>
      </div>
    </div>
  );
}
