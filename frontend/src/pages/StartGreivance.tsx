import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, CheckCircle, Calendar, DollarSign, FileCheck, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { caseAPI } from "@/services/cases";
import { useTranslation } from "react-i18next";
import { DocumentUploadSection } from "@/components/DocumentUploadSection";

// Helper function to format number in Indian style (lakhs system)
const formatIndianNumber = (num: number): string => {
  const numStr = num.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  if (otherNumbers !== '') {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  return lastThree;
};

// Helper function to convert number to Indian words
const numberToIndianWords = (num: number): string => {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return ones[hundred] + ' Hundred' + (rest > 0 ? ' ' + convertLessThanThousand(rest) : '');
  };
  
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;
  
  let words = '';
  
  if (crore > 0) words += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) words += convertLessThanThousand(remainder);
  
  return words.trim() + ' Rupees Only';
};

export default function StartGreivance() {
  const { t } = useTranslation('grievance');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form data
  const [incidentData, setIncidentData] = useState({
    incident_date: "",
    policy_number: "",
    claim_amount: "",
    description: "",
    insurance_type: "",
  });

  // For formatted display and words
  const [claimAmountDisplay, setClaimAmountDisplay] = useState("");
  const [claimAmountWords, setClaimAmountWords] = useState("");

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [areDocumentsValid, setAreDocumentsValid] = useState(false);

  const canProceedStep1 = incidentData.incident_date && incidentData.policy_number && incidentData.description && incidentData.insurance_type;
  const canProceedStep2 = areDocumentsValid;

  const handleDocumentsChange = (documents: any[], isValid: boolean) => {
    setUploadedDocuments(documents);
    setAreDocumentsValid(isValid);
  };

  const handleClaimAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, ''); // Remove non-digits
    
    if (input === '') {
      setIncidentData(prev => ({ ...prev, claim_amount: '' }));
      setClaimAmountDisplay('');
      setClaimAmountWords('');
      return;
    }
    
    const numericValue = parseInt(input);
    
    // Store the actual value
    setIncidentData(prev => ({ ...prev, claim_amount: numericValue.toString() }));
    
    // Format for display with Indian comma system
    setClaimAmountDisplay(formatIndianNumber(numericValue));
    
    // Convert to words
    setClaimAmountWords(numberToIndianWords(numericValue));
  };

  const handleNext = async () => {
    if (step === 1 && canProceedStep1) {
      setStep(2);
    } else if (step === 2 && canProceedStep2) {
      setStep(3);
    } else if (step === 3) {
      // Create case
      try {
        setIsSaving(true);
        
        const caseData = {
          insurance_company: user?.insurance_company && typeof user.insurance_company === 'object' 
            ? user.insurance_company.id 
            : undefined,
          policy_number: incidentData.policy_number,
          insurance_type: incidentData.insurance_type,
          subject: `Insurance Grievance - ${incidentData.policy_number}`,
          description: incidentData.description,
          date_of_incident: incidentData.incident_date,
        };

        // Step 1: Create the case
        const response = await caseAPI.create(caseData);
        console.log('Case creation response:', response);
        console.log('Response data:', response.data);
        
        // Extract case ID - check multiple possible locations
        const responseData = response.data as any;
        const caseId = responseData?.id || responseData?.data?.id;
        
        if (!caseId) {
          console.error('No case ID found in response:', response.data);
          toast.error('Case created but ID not found. Please refresh the page.');
          return;
        }
        
        console.log('Extracted case ID:', caseId);
        
        // Step 2: Upload documents to the created case
        if (uploadedDocuments.length > 0) {
          toast.info(`Uploading ${uploadedDocuments.length} document(s)...`);
          
          const uploadPromises = uploadedDocuments.map(doc => {
            const formData = new FormData();
            formData.append('file', doc.file);
            formData.append('document_type', doc.isMandatory ? 'policy_document' : 'support_document');
            formData.append('description', `${doc.requirementLabel} - ${doc.file.name}`);
            return caseAPI.uploadDocument(caseId, formData);
          });
          
          try {
            await Promise.all(uploadPromises);
            toast.success(`Case created with ${uploadedDocuments.length} document(s)!`);
          } catch (uploadError) {
            console.error('Document upload error:', uploadError);
            toast.warning('Case created, but some documents failed to upload');
          }
        } else {
          toast.success("Grievance created successfully!");
        }
        
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } catch (error: any) {
        console.error('Case creation error:', error);
        toast.error(error.response?.data?.message || "Failed to create grievance. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Panel - Info */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-white" />
          </div>
          <BrandLogo size="md" inverted />
        </div>
        <div className="text-white">
          <h2 className="text-3xl font-bold mb-4 whitespace-pre-line">
            {t('left_panel.title')}
          </h2>
          <p className="text-white/80 mb-8">
            {t('left_panel.subtitle')}
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-white/80 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">{t('left_panel.features.simple.title')}</p>
                <p className="text-sm text-white/70">{t('left_panel.features.simple.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-white/80 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">{t('left_panel.features.secure.title')}</p>
                <p className="text-sm text-white/70">{t('left_panel.features.secure.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-white/80 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">{t('left_panel.features.professional.title')}</p>
                <p className="text-sm text-white/70">{t('left_panel.features.professional.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 1 ? "bg-white" : "bg-white/30")} />
          <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 2 ? "bg-white" : "bg-white/30")} />
          <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 3 ? "bg-white" : "bg-white/30")} />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden px-4 pt-4 pb-3 border-b bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={handleBack} className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <BrandLogo size="sm" />
          </div>
          <div className="flex gap-2">
            {[
              { n: 1, label: "Details" },
              { n: 2, label: "Documents" },
              { n: 3, label: "Review" },
            ].map(({ n, label }) => (
              <div key={n} className="flex-1 flex flex-col gap-1">
                <div className={cn(
                  "h-1 rounded-full transition-colors",
                  step > n ? "bg-primary" : step === n ? "bg-primary" : "bg-muted"
                )} />
                <span className={cn(
                  "text-xs text-center font-medium transition-colors",
                  step === n ? "text-primary" : step > n ? "text-primary/60" : "text-muted-foreground"
                )}>
                  {step > n ? "✓ " : ""}{label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-12 overflow-auto">
          <div className="max-w-xl mx-auto">
            {/* Desktop back button */}
            <button 
              onClick={handleBack}
              className="hidden lg:flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t('actions.back')}</span>
            </button>

            {/* Step 1: Incident Details */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{t('step1.title')}</h1>
                <p className="text-muted-foreground mb-8">{t('step1.subtitle')}</p>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="insurance_type">Insurance Type <span className="text-destructive">*</span></Label>
                    <Select 
                      value={incidentData.insurance_type}
                      onValueChange={(value) => setIncidentData(prev => ({ ...prev, insurance_type: value }))}
                    >
                      <SelectTrigger className="mt-2 h-11">
                        <SelectValue placeholder="Select insurance type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health">Health Insurance</SelectItem>
                        <SelectItem value="life">Life Insurance</SelectItem>
                        <SelectItem value="motor">Motor Insurance</SelectItem>
                        <SelectItem value="home">Home Insurance</SelectItem>
                        <SelectItem value="travel">Travel Insurance</SelectItem>
                        <SelectItem value="consumer_dispute">Consumer Dispute</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="incident_date">{t('step1.incident_date')}</Label>
                    <Input 
                      id="incident_date"
                      type="date"
                      value={incidentData.incident_date}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, incident_date: e.target.value }))}
                      className="mt-2 h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="policy_number">{t('step1.policy_number')}</Label>
                    <Input
                      id="policy_number"
                      placeholder="e.g., POL123456789"
                      inputMode="text"
                      autoCapitalize="characters"
                      value={incidentData.policy_number}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, policy_number: e.target.value }))}
                      className="mt-2 h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="claim_amount" className="text-base font-semibold">{t('step1.claim_amount')}</Label>
                    <div className="relative mt-3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-bold text-xl">₹</span>
                      <Input
                        id="claim_amount"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={claimAmountDisplay}
                        onChange={handleClaimAmountChange}
                        className="h-auto py-3 pl-12 pr-3 !text-2xl font-bold text-foreground leading-none"
                        style={{ fontSize: '3.75rem' }}
                      />
                    </div>
                    {claimAmountWords && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Amount in Words
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {claimAmountWords}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Minimum claim amount is ₹20,000
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Explain your reason why are you filing this case</Label>
                    <Textarea 
                      id="description"
                      placeholder="Provide details about your claim - what happened, why you're filing, and what resolution you're seeking..."
                      value={incidentData.description}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Upload Documents */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Upload Required Documents</h1>
                <p className="text-muted-foreground mb-8">
                  Please upload all mandatory documents for your {incidentData.insurance_type} insurance claim.
                </p>

                <DocumentUploadSection 
                  insuranceType={incidentData.insurance_type}
                  onDocumentsChange={handleDocumentsChange}
                />
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{t('step3.title')}</h1>
                <p className="text-muted-foreground mb-8">{t('step3.subtitle')}</p>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">{t('step3.incident_details')}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Insurance Type</p>
                        <p className="font-medium capitalize">{incidentData.insurance_type.replace('_', ' ')} Insurance</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('step1.incident_date')}</p>
                        <p className="font-medium">{incidentData.incident_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('step1.policy_number')}</p>
                        <p className="font-medium">{incidentData.policy_number}</p>
                      </div>
                      {incidentData.claim_amount && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('step1.claim_amount')}</p>
                          <p className="font-medium">₹{incidentData.claim_amount}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium text-sm mt-1">{incidentData.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">{t('step3.documents')}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {uploadedDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{doc.file.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.requirementLabel}</p>
                            </div>
                            {doc.isMandatory && (
                              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Mandatory</span>
                            )}
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground pt-2">{uploadedDocuments.length} document(s) uploaded</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        Once you create this grievance, we'll generate a professional letter based on your details. You can review and edit it before sending to the insurance company.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA — sticky on mobile */}
        <div className="sticky bottom-0 bg-background border-t p-4 lg:relative lg:p-12 lg:pt-0 lg:border-t-0">
          <div className="max-w-xl mx-auto">
            <Button
              size="lg"
              className="w-full h-12"
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                isSaving
              }
            >
              {isSaving ? t('actions.submitting') : step === 3 ? t('actions.submit') : t('actions.continue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
