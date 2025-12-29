import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const emailSubject = "Formal Grievance: Claim Rejection - Policy #MED2024XXXXX";

const emailBody = `Dear Grievance Officer,

I am writing to formally register my grievance regarding the rejection of my health insurance claim under Policy Number MED2024XXXXX.

Claim Details:
- Claim Number: CLM987654321
- Date of Submission: 15th December 2024
- Amount Claimed: ₹1,50,000
- Reason for Rejection: "Pre-existing condition"

I strongly contest this rejection on the following grounds:

1. The condition in question was not pre-existing and developed after the policy inception date.
2. I have enclosed all medical records demonstrating the timeline of diagnosis.
3. The policy terms do not exclude this condition under the waiting period clause.

I request you to:
1. Review my claim afresh with the enclosed documents
2. Provide a detailed explanation if rejection is maintained
3. Process the claim within 15 days as per IRDAI guidelines

Please acknowledge receipt of this grievance within 24 hours.

Regards,
[Your Name]
Policy Holder`;

export default function Drafter() {
  const navigate = useNavigate();
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const copyToClipboard = async (text: string, type: "subject" | "body") => {
    await navigator.clipboard.writeText(text);
    if (type === "subject") {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
    toast.success(`${type === "subject" ? "Subject" : "Body"} copied to clipboard`);
  };

  const handleConfirm = () => {
    toast.success("Great! Your case has been updated.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen page-padding flex flex-col md:items-center">
      <div className="w-full md:max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold">Grievance Drafter</h1>
        </div>

        <div className="md:grid md:grid-cols-1 md:gap-6">
          {/* Subject */}
          <div className="mb-4 md:mb-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">Subject</label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(emailSubject, "subject")}
                className="gap-2"
              >
                {copiedSubject ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-xl font-mono text-sm">
              {emailSubject}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 mb-4 md:mb-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">Email Body</label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(emailBody, "body")}
                className="gap-2"
              >
                {copiedBody ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-xl font-mono text-sm whitespace-pre-wrap h-[400px] md:h-[500px] overflow-y-auto">
              {emailBody}
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-background md:static md:mt-6">
          <Button 
            size="full" 
            variant="success"
            onClick={handleConfirm}
            className="md:max-w-xs md:mx-auto"
          >
            I have sent this email
          </Button>
        </div>
      </div>
    </div>
  );
}
