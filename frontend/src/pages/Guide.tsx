import { ExternalLink, FileText, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    description: "The official letter from your insurer stating the reason for claim rejection. This is crucial for your Ombudsman complaint.",
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
    description: "Your complete insurance policy document including all terms, conditions, and exclusions.",
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
    description: "Identity and address proof documents required for the Ombudsman complaint form.",
    tips: [
      "Aadhaar or PAN card copy",
      "Recent passport photo",
      "Address proof if different from Aadhaar",
    ],
  },
];

export default function Guide() {
  return (
    <div className="page-padding animate-fade-in md:max-w-2xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Ombudsman Checklist</h1>
        <p className="text-muted-foreground">
          Documents you'll need to file an Ombudsman complaint
        </p>
      </div>

      {/* Checklist Accordion */}
      <Accordion type="single" collapsible className="space-y-3">
        {checklistItems.map((item) => (
          <AccordionItem 
            key={item.id} 
            value={item.id}
            className="card-base border-0"
          >
            <AccordionTrigger className="hover:no-underline py-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold text-left">{item.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-0">
              <p className="text-muted-foreground text-sm mb-4">
                {item.description}
              </p>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Tips</p>
                <ul className="space-y-2">
                  {item.tips.map((tip, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* External Link */}
      <div className="mt-8">
        <Button 
          variant="outline" 
          size="full"
          className="gap-2"
          onClick={() => window.open("https://www.cioins.co.in/ombudsman", "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          Find Ombudsman Address
        </Button>
      </div>
    </div>
  );
}
