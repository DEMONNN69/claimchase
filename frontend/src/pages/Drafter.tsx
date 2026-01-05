import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Building2, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { useCreateCase, useInsuranceCompanies } from "@/hooks/useApi";
import { gmailAPI } from "@/services/gmail";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { InsuranceCompany } from "@/services/types";

const emailSubject = "Formal Grievance: Claim Rejection";

const emailBody = `Dear Grievance Officer,

I am writing to formally register my grievance regarding the rejection of my insurance claim.

Claim Details:
- Date of Submission: [Date]
- Amount Claimed: [Amount]
- Reason for Rejection: [Reason]

I strongly contest this rejection on the following grounds:

1. [Your reason 1]
2. [Your reason 2]
3. [Your reason 3]

I request you to:
1. Review my claim afresh with the enclosed documents
2. Provide a detailed explanation if rejection is maintained
3. Process the claim within 15 days as per IRDAI guidelines

Please acknowledge receipt of this grievance within 24 hours.

Regards,
[Your Name]`;

export default function Drafter() {
  const navigate = useNavigate();
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    insurance_company: null as number | null,
    policy_number: "",
    insurance_type: "health",
    subject: emailSubject,
    description: emailBody,
    date_of_incident: new Date().toISOString().split("T")[0],
  });

  // Fetch insurance companies
  const { data: companies = [], isLoading: loadingCompanies } = useInsuranceCompanies();
  const selectedCompany = companies.find((c: InsuranceCompany) => c.id === formData.insurance_company);

  // Create case mutation
  const createCaseMutation = useCreateCase();

  const copyToClipboard = async (text: string, type: "subject" | "body") => {
    await navigator.clipboard.writeText(text);
    if (type === "subject") {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
    toast.success(`${type === "subject" ? "Subject" : "Body"} copied!`);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitCase = async () => {
    if (!formData.insurance_company || !formData.policy_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (Object.keys(createCaseMutation).length === 0) {
      toast.success("Case created! Ready to send grievance.");
      navigate("/dashboard");
      return;
    }

    try {
      createCaseMutation.mutate(formData, {
        onSuccess: async (response: any) => {
          const caseId = response.data.id;
          
          // Show initial success
          toast.success("Case created! Sending email...");
          
          try {
            // Send email automatically via Gmail
            await gmailAPI.sendEmail(caseId, formData.description, []);
            
            toast.success("Grievance email sent successfully!");
            navigate("/dashboard");
          } catch (emailError: any) {
            // Case created but email failed
            const errorMsg = emailError.response?.data?.message || "Failed to send email";
            
            if (errorMsg.includes("Gmail account not connected")) {
              toast.error("Please connect your Gmail account in Settings to send emails");
              navigate("/settings");
            } else {
              toast.error(`Case created, but ${errorMsg}. You can resend from Dashboard.`);
              navigate("/dashboard");
            }
          }
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to create case");
        },
      });
    } catch {
      toast.error("Error creating case");
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'life': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'health': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'general': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="p-5 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Grievance Drafter</h1>
          <p className="text-sm text-muted-foreground">Draft and send your formal grievance</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Case Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Case Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Insurance Company */}
              <div>
                <Label className="text-sm">Insurance Company *</Label>
                <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between mt-2 h-11"
                    >
                      {selectedCompany ? (
                        <span className="truncate">{selectedCompany.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Select company...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandList>
                        <CommandEmpty>
                          {loadingCompanies ? "Loading..." : "No companies found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {companies.map((company: InsuranceCompany) => (
                            <CommandItem
                              key={company.id}
                              value={company.name}
                              onSelect={() => {
                                handleInputChange("insurance_company", company.id);
                                setCompanySearchOpen(false);
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate">{company.name}</span>
                                <Badge variant="outline" className={getCategoryBadgeColor(company.category)}>
                                  {company.category_display}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {selectedCompany?.grievance_email && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    📧 {selectedCompany.grievance_email}
                  </p>
                )}
              </div>

              {/* Policy Number */}
              <div>
                <Label className="text-sm">Policy Number *</Label>
                <Input 
                  placeholder="POL123456"
                  value={formData.policy_number}
                  onChange={(e) => handleInputChange("policy_number", e.target.value)}
                  className="mt-2 h-11"
                />
              </div>

              {/* Date */}
              <div>
                <Label className="text-sm">Date of Incident</Label>
                <Input 
                  type="date"
                  value={formData.date_of_incident}
                  onChange={(e) => handleInputChange("date_of_incident", e.target.value)}
                  className="mt-2 h-11"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Email Template */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Email Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Subject</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(formData.subject, "subject")}
                    className="h-8 gap-1 text-xs"
                  >
                    {copiedSubject ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
                <Input 
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Body</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(formData.description, "body")}
                    className="h-8 gap-1 text-xs"
                  >
                    {copiedBody ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[350px] lg:min-h-[400px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="mt-6">
            <Button 
              size="lg"
              className="w-full lg:w-auto h-12 px-8 gap-2"
              onClick={handleSubmitCase}
              disabled={createCaseMutation.isPending}
            >
              <Send className="h-4 w-4" />
              {createCaseMutation.isPending ? "Sending..." : "Send Grievance Email"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a case and automatically send the email via your connected Gmail
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
