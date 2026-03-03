import { useState } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DocumentRequirement {
  id: string;
  label: string;
  isMandatory: boolean;
  accepted?: boolean;
}

interface DocumentConfig {
  [key: string]: DocumentRequirement[];
}

// Document requirements based on insurance type
export const DOCUMENT_REQUIREMENTS: DocumentConfig = {
  health: [
    { id: "policy_copy", label: "Policy Copy", isMandatory: true },
    { id: "claim_denial_letter", label: "Claim Denial Letter OR Partial Settlement Statement", isMandatory: true },
    { id: "correspondence", label: "Any Correspondence with Insurance Company or TPA", isMandatory: false },
  ],
  life: [
    { id: "policy_copy", label: "Policy Copy", isMandatory: true },
    { id: "claim_denial_letter", label: "Claim Denial Letter", isMandatory: true },
    { id: "communication", label: "Any Representation / Communication with Insurance Company", isMandatory: false },
  ],
  motor: [
    { id: "policy_copy", label: "Policy Copy", isMandatory: true },
    { id: "claim_denial_letter", label: "Claim Denial / Rejection Letter or Email", isMandatory: true },
    { id: "correspondence", label: "Any Correspondence with Insurance Company", isMandatory: false },
  ],
  other: [
    { id: "policy_copy", label: "Policy Copy", isMandatory: true },
    { id: "support_document", label: "Supporting Documents", isMandatory: false },
  ],
  home: [
    { id: "policy_copy", label: "Policy Copy", isMandatory: true },
    { id: "claim_denial_letter", label: "Claim Denial / Rejection Letter", isMandatory: true },
    { id: "correspondence", label: "Any Correspondence with Insurance Company", isMandatory: false },
  ],
  travel: [
    { id: "policy_copy", label: "Policy Copy", isMandatory: true },
    { id: "claim_denial_letter", label: "Claim Denial / Rejection Letter", isMandatory: true },
    { id: "correspondence", label: "Any Correspondence with Insurance Company", isMandatory: false },
  ],
  // Consumer Disputes
  consumer_dispute: [
    { id: "invoice_bill", label: "Invoice Copy / Bill Copy (with warranty clause mandatory)", isMandatory: true },
    { id: "dispute_correspondence", label: "Dispute Correspondence with Company", isMandatory: false },
    { id: "followup_email", label: "Follow-up Email / Letter with Company", isMandatory: false },
  ],
};

interface UploadedDocument {
  file: File;
  requirementId: string;
  requirementLabel: string;
  isMandatory: boolean;
}

interface DocumentUploadSectionProps {
  insuranceType: string;
  onDocumentsChange: (documents: UploadedDocument[], isValid: boolean) => void;
}

export function DocumentUploadSection({ insuranceType, onDocumentsChange }: DocumentUploadSectionProps) {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  
  const requirements = DOCUMENT_REQUIREMENTS[insuranceType] || [];
  const mandatoryRequirements = requirements.filter(req => req.isMandatory);
  const optionalRequirements = requirements.filter(req => !req.isMandatory);
  
  // Check which mandatory documents are uploaded
  const uploadedMandatoryIds = new Set(
    uploadedDocuments
      .filter(doc => doc.isMandatory)
      .map(doc => doc.requirementId)
  );
  
  const allMandatoryUploaded = mandatoryRequirements.every(req =>
    uploadedMandatoryIds.has(req.id)
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, requirement: DocumentRequirement) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const invalidFiles = files.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast.error(`File size exceeds 10MB limit: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    const newDocuments = files.map(file => ({
      file,
      requirementId: requirement.id,
      requirementLabel: requirement.label,
      isMandatory: requirement.isMandatory,
    }));
    
    const updatedDocuments = [...uploadedDocuments, ...newDocuments];
    setUploadedDocuments(updatedDocuments);
    
    // Check if all mandatory documents are uploaded
    const updatedMandatoryIds = new Set(
      updatedDocuments
        .filter(doc => doc.isMandatory)
        .map(doc => doc.requirementId)
    );
    const isValid = mandatoryRequirements.every(req => updatedMandatoryIds.has(req.id));
    
    onDocumentsChange(updatedDocuments, isValid);
    
    toast.success(`${files.length} file(s) uploaded successfully`);
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = uploadedDocuments.filter((_, i) => i !== index);
    setUploadedDocuments(updatedDocuments);
    
    // Recheck validation
    const updatedMandatoryIds = new Set(
      updatedDocuments
        .filter(doc => doc.isMandatory)
        .map(doc => doc.requirementId)
    );
    const isValid = mandatoryRequirements.every(req => updatedMandatoryIds.has(req.id));
    
    onDocumentsChange(updatedDocuments, isValid);
  };

  const getUploadedCountForRequirement = (requirementId: string) => {
    return uploadedDocuments.filter(doc => doc.requirementId === requirementId).length;
  };

  const isRequirementFulfilled = (requirementId: string) => {
    return uploadedDocuments.some(doc => doc.requirementId === requirementId);
  };

  if (!insuranceType) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Mandatory Documents Section */}
      {mandatoryRequirements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-lg">Mandatory Documents</h3>
            <Badge variant="destructive" className="ml-auto">Required</Badge>
          </div>
          
          <div className="space-y-4">
            {mandatoryRequirements.map((requirement) => {
              const uploadedCount = getUploadedCountForRequirement(requirement.id);
              const isFulfilled = isRequirementFulfilled(requirement.id);
              
              return (
                <div 
                  key={requirement.id}
                  className={cn(
                    "border-2 rounded-lg p-4 transition-colors",
                    isFulfilled ? "border-green-500 bg-green-50" : "border-red-200 bg-red-50"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-medium">{requirement.label}</Label>
                        <span className="text-destructive text-lg">*</span>
                        {isFulfilled && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      {uploadedCount > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {uploadedCount} file(s) uploaded
                        </p>
                      )}
                    </div>
                  </div>

                  <input
                    type="file"
                    id={`upload-${requirement.id}`}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, requirement)}
                    multiple
                    accept="*/*"
                  />
                  <label 
                    htmlFor={`upload-${requirement.id}`}
                    className="cursor-pointer block"
                  >
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Max file size: 10MB</p>
                    </div>
                  </label>

                  {/* Show uploaded files for this requirement */}
                  {uploadedDocuments
                    .filter(doc => doc.requirementId === requirement.id)
                    .map((doc, index) => {
                      const globalIndex = uploadedDocuments.indexOf(doc);
                      return (
                        <div 
                          key={globalIndex}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg mt-2"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{doc.file.name}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {(doc.file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                          <button
                            onClick={() => removeDocument(globalIndex)}
                            className="ml-2 p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                            type="button"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Documents Section */}
      {optionalRequirements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Optional Documents</h3>
            <Badge variant="secondary" className="ml-auto">Not Required</Badge>
          </div>
          
          <div className="space-y-4">
            {optionalRequirements.map((requirement) => {
              const uploadedCount = getUploadedCountForRequirement(requirement.id);
              
              return (
                <div 
                  key={requirement.id}
                  className="border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Label className="text-base font-medium">{requirement.label}</Label>
                      {uploadedCount > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {uploadedCount} file(s) uploaded
                        </p>
                      )}
                    </div>
                  </div>

                  <input
                    type="file"
                    id={`upload-${requirement.id}`}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, requirement)}
                    multiple
                    accept="*/*"
                  />
                  <label 
                    htmlFor={`upload-${requirement.id}`}
                    className="cursor-pointer block"
                  >
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Max file size: 10MB</p>
                    </div>
                  </label>

                  {/* Show uploaded files for this requirement */}
                  {uploadedDocuments
                    .filter(doc => doc.requirementId === requirement.id)
                    .map((doc, index) => {
                      const globalIndex = uploadedDocuments.indexOf(doc);
                      return (
                        <div 
                          key={globalIndex}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg mt-2"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{doc.file.name}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {(doc.file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                          <button
                            onClick={() => removeDocument(globalIndex)}
                            className="ml-2 p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                            type="button"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Message */}
      {mandatoryRequirements.length > 0 && !allMandatoryUploaded && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm text-destructive">Missing mandatory documents</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please upload all mandatory documents to proceed with case submission.
            </p>
          </div>
        </div>
      )}

      {allMandatoryUploaded && mandatoryRequirements.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm text-green-800">All mandatory documents uploaded</p>
            <p className="text-sm text-green-700 mt-1">
              You can proceed with submitting your case.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
