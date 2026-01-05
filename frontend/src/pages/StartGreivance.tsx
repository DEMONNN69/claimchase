import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, CheckCircle, Calendar, DollarSign, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { caseAPI } from "@/services/cases";

export default function StartGreivance() {
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
  });

  const [documents, setDocuments] = useState<File[]>([]);
  const [documentNames, setDocumentNames] = useState<string[]>([]);

  const canProceedStep1 = incidentData.incident_date && incidentData.policy_number && incidentData.description;
  const canProceedStep2 = documents.length > 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments([...documents, ...files]);
    setDocumentNames([...documentNames, ...files.map(f => f.name)]);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
    setDocumentNames(documentNames.filter((_, i) => i !== index));
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
          insurance_type: user?.problem_type || "",
          subject: `Insurance Grievance - ${incidentData.policy_number}`,
          description: incidentData.description,
          date_of_incident: incidentData.incident_date,
        };

        // Step 1: Create the case
        const response = await caseAPI.create(caseData);
        console.log('Case creation response:', response);
        console.log('Response data:', response.data);
        
        // Extract case ID - check multiple possible locations
        const caseId = response.data?.id || response.data?.data?.id;
        
        if (!caseId) {
          console.error('No case ID found in response:', response.data);
          toast.error('Case created but ID not found. Please refresh the page.');
          return;
        }
        
        console.log('Extracted case ID:', caseId);
        
        // Step 2: Upload documents to the created case
        if (documents.length > 0) {
          toast.info(`Uploading ${documents.length} document(s)...`);
          
          const uploadPromises = documents.map(file => 
            caseAPI.uploadDocument(caseId, file, 'support_document', file.name)
          );
          
          try {
            await Promise.all(uploadPromises);
            toast.success(`Case created with ${documents.length} document(s)!`);
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
          <span className="text-white font-bold text-xl">ClaimChase</span>
        </div>
        <div className="text-white">
          <h2 className="text-3xl font-bold mb-4">
            File Your<br />Grievance
          </h2>
          <p className="text-white/80 mb-8">
            Organize your case details and supporting documents in one place.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-white/80 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Simple Process</p>
                <p className="text-sm text-white/70">3 easy steps to file</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-white/80 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Secure Upload</p>
                <p className="text-sm text-white/70">All documents encrypted</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-white/80 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Professional Letters</p>
                <p className="text-sm text-white/70">Auto-generated templates</p>
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
        <div className="lg:hidden p-4 border-b flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex gap-2">
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 3 ? "bg-primary" : "bg-muted")} />
          </div>
          <span className="text-sm text-muted-foreground">{step}/3</span>
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
              <span className="text-sm">Back</span>
            </button>

            {/* Step 1: Incident Details */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Incident Details</h1>
                <p className="text-muted-foreground mb-8">Tell us about the incident and your policy.</p>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="incident_date">Date of Incident</Label>
                    <Input 
                      id="incident_date"
                      type="date"
                      value={incidentData.incident_date}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, incident_date: e.target.value }))}
                      className="mt-2 h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="policy_number">Policy Number</Label>
                    <Input 
                      id="policy_number"
                      placeholder="e.g., POL123456789"
                      value={incidentData.policy_number}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, policy_number: e.target.value }))}
                      className="mt-2 h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="claim_amount">Claim Amount (Optional)</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input 
                        id="claim_amount"
                        type="number"
                        placeholder="Amount in rupees"
                        value={incidentData.claim_amount}
                        onChange={(e) => setIncidentData(prev => ({ ...prev, claim_amount: e.target.value }))}
                        className="mt-0 h-11 pl-7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">What Happened?</Label>
                    <Textarea 
                      id="description"
                      placeholder="Describe the incident in detail..."
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
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Supporting Documents</h1>
                <p className="text-muted-foreground mb-8">Upload receipts, policy copy, rejection letters, etc.</p>

                <div className="space-y-5">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <p className="font-semibold mb-1">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">PDF, images, up to 10MB each</p>
                    </label>
                  </div>

                  {/* Uploaded Documents */}
                  {documents.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Uploaded Documents ({documents.length})</p>
                      <div className="space-y-2">
                        {documentNames.map((name, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm font-medium truncate">{name}</p>
                            </div>
                            <button
                              onClick={() => removeDocument(index)}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    💡 Tip: Include policy document, rejection letter, and any relevant receipts.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Review Your Details</h1>
                <p className="text-muted-foreground mb-8">Please review before creating your grievance.</p>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Incident Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Incident</p>
                        <p className="font-medium">{incidentData.incident_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Policy Number</p>
                        <p className="font-medium">{incidentData.policy_number}</p>
                      </div>
                      {incidentData.claim_amount && (
                        <div>
                          <p className="text-sm text-muted-foreground">Claim Amount</p>
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
                    <CardHeader>
                      <CardTitle className="text-base">Documents Attached</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {documentNames.map((name, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{name}</span>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground pt-2">{documents.length} file(s) uploaded</p>
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

        {/* Footer CTA */}
        <div className="p-6 lg:p-12 lg:pt-0 border-t lg:border-t-0">
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
              {isSaving ? "Creating..." : step === 3 ? "Create Grievance" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
