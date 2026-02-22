import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Check, Building2, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { useCreateCase, useInsuranceCompanies } from "@/hooks/useApi";
import { BrandLogo } from "@/components/BrandLogo";
import { caseAPI } from "@/services/cases";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('drafter');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const caseId = id ? parseInt(id) : null;
  
  // Fetch existing case data if editing
  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => caseAPI.get(caseId!),
    enabled: !!caseId,
  });
  
  // Form fields - initialize with existing case data or defaults
  const [formData, setFormData] = useState({
    insurance_company: null as number | null,
    policy_number: "",
    insurance_type: "health",
    subject: emailSubject,
    description: emailBody,
    date_of_incident: new Date().toISOString().split("T")[0],
  });
  
  // Update form when case data loads
  React.useEffect(() => {
    if (caseData?.data) {
      const case_info = caseData.data;
      setFormData({
        insurance_company: case_info.insurance_company || null,
        policy_number: case_info.policy_number || "",
        insurance_type: case_info.insurance_type || "health",
        subject: case_info.subject || emailSubject,
        description: case_info.description || emailBody,
        date_of_incident: case_info.date_of_incident || new Date().toISOString().split("T")[0],
      });
    }
  }, [caseData]);

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

    if (!user?.gmail_connected) {
      toast.error("Please connect your Gmail account to send emails");
      navigate("/settings");
      return;
    }

    try {
      let finalCaseId = caseId;
      
      // If editing existing case, just send email
      if (caseId) {
        setIsSendingEmail(true);
      } else {
        // Create new case if no caseId
        if (Object.keys(createCaseMutation).length === 0) {
          toast.error("Unable to create case at this time");
          return;
        }
        
        setIsCreatingCase(true);
        const caseResult = await createCaseMutation.mutateAsync(formData);
        finalCaseId = caseResult.id;
        toast.success("Case created successfully!");
        
        setIsCreatingCase(false);
        setIsSendingEmail(true);
      }
      
      // Send the email
      const emailResult = await caseAPI.sendEmail(finalCaseId!, {
        email_body: formData.description
      });
      
      if (emailResult.data.success) {
        toast.success("Grievance email sent successfully!");
        navigate("/dashboard");
      } else {
        toast.error(emailResult.data.message || "Failed to send email");
        navigate(`/cases/${finalCaseId}`); // Navigate to case detail even if email failed
      }
      
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to process case and send email";
      toast.error(errorMessage);
    } finally {
      setIsCreatingCase(false);
      setIsSendingEmail(false);
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
    <div className="min-h-screen">
      {/* Mobile Navbar - Only visible on mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
        </div>
      </div>

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
            <h1 className="text-xl lg:text-2xl font-bold">
              {caseId ? t('edit_title') : t('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {caseId ? t('edit_subtitle') : t('subtitle')}
            </p>
          </div>
        </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Show loading state while fetching case data */}
        {caseId && loadingCase ? (
          <div className="lg:col-span-3 flex justify-center py-12">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : (
          <>
        {/* Left: Case Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t('case_details.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Insurance Company */}
              <div>
                <Label className="text-sm">{t('case_details.insurance_company')} *</Label>
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
                        <span className="text-muted-foreground">{t('case_details.select_company')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandList>
                        <CommandEmpty>
                          {loadingCompanies ? t('loading') : t('case_details.no_companies')}
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
                <Label className="text-sm">{t('case_details.policy_number')} *</Label>
                <Input 
                  placeholder={t('case_details.policy_placeholder')}
                  value={formData.policy_number}
                  onChange={(e) => handleInputChange("policy_number", e.target.value)}
                  className="mt-2 h-11"
                />
              </div>

              {/* Date */}
              <div>
                <Label className="text-sm">{t('case_details.incident_date')}</Label>
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
                {t('email_draft.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">{t('email_draft.subject')}</Label>
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
                  <Label className="text-sm">{t('email_draft.body')}</Label>
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
              disabled={isCreatingCase || isSendingEmail || createCaseMutation.isPending}
            >
              <Send className="h-4 w-4" />
              {isCreatingCase ? t('actions.creating') : 
               isSendingEmail ? t('actions.sending') : 
               caseId ? t('actions.send') : t('actions.send')}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              {!user?.gmail_connected ? 
                "Please connect Gmail in Settings first" :
                caseId ? "This will send the email via your connected Gmail" :
                "This will create a case and send the email via your connected Gmail"}
            </p>
            
            {/* Gmail Connection Status */}
            {user?.gmail_connected ? (
              <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Gmail: {user.gmail_email}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3 text-sm text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                {t('gmail.connect_prompt')}
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>
      </div>
    </div>
  );
}
