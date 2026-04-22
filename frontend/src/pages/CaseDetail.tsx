import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  X,
  ExternalLink,
  Plus,
  Send,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { caseAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { CaseDetailSkeleton } from "@/components/LoadingSkeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const documentTypes = [
  { value: "policy_document", label: "Policy Document" },
  { value: "claim_form", label: "Claim Form" },
  { value: "medical_report", label: "Medical Report" },
  { value: "bill_invoice", label: "Bill/Invoice" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
];

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState("other");
  const [description, setDescription] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const caseId = id ? parseInt(id) : null;

  // Fetch case details
  const { data: caseData, isLoading, refetch } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => caseAPI.get(caseId!),
    enabled: !!caseId,
  });

  // Fetch documents
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ["case-documents", caseId],
    queryFn: async () => {
      const response = await caseAPI.getDocuments(caseId!);
      return response.data;
    },
    enabled: !!caseId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      formData.append("description", description);

      return caseAPI.uploadDocument(caseId!, formData);
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetchDocuments();
      refetch();
    },
    onError: () => {},
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadingFiles(files);
    }
  };

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    for (const file of uploadingFiles) {
      try {
        await uploadMutation.mutateAsync(file);
      } catch (error: any) {
        const msg = error.response?.data?.message || "Upload failed";
        toast.error(`"${file.name}": ${msg}`);
      }
    }

    // Reset form
    setUploadingFiles([]);
    setDocumentType("other");
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handleSendEmail = async () => {
    if (!user?.gmail_connected) {
      toast.error("Please connect your Gmail account to send emails");
      navigate("/settings");
      return;
    }

    if (!caseData?.data.description) {
      toast.error("No email content available to send");
      return;
    }

    try {
      setIsSendingEmail(true);
      const emailResult = await caseAPI.sendEmail(caseId!, {
        email_body: caseData.data.description
      });
      
      if (emailResult.data.success) {
        toast.success("Email sent successfully!");
        refetch(); // Refresh case data to update status
      } else {
        toast.error(emailResult.data.message || "Failed to send email");
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to send email";
      toast.error(errorMessage);
    } finally {
      setIsSendingEmail(false);
    }
  };
  if (isLoading) {
    return <CaseDetailSkeleton />;
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Case not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800",
    submitted: "bg-green-100 text-green-800",
    under_review: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    escalated_to_ombudsman: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-primary truncate flex-1">
            {caseData.data.case_number}
          </h1>
          <Badge className={`${statusColors[caseData.data.status] || ""} text-xs`}>
            {caseData.data.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">
                Case {caseData.data.case_number}
              </h1>
              <p className="text-slate-500 mt-1 truncate">{caseData.data.subject}</p>
            </div>
            
            {/* Send Email Button */}
            {caseData.data.status === 'draft' && (
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !user?.gmail_connected}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isSendingEmail ? "Sending..." : "Send Email"}
              </Button>
            )}
            
            {/* Ombudsman Guide Button */}
            {caseData.data.status === 'escalated_to_ombudsman' && (
              <Button
                onClick={() => navigate(`/cases/${caseId}/ombudsman-guide`)}
                variant="default"
                className="gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <FileText className="h-4 w-4" />
                Ombudsman Form Guide
              </Button>
            )}
            
            <Badge className={statusColors[caseData.data.status] || ""}>
              {caseData.data.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Mobile Subject & Send Button */}
          <div className="lg:hidden space-y-3">
            <p className="text-slate-600 text-sm line-clamp-2">{caseData.data.subject}</p>
            {caseData.data.status === 'draft' && (
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !user?.gmail_connected}
                className="gap-2 w-full"
                size="sm"
              >
                <Send className="h-4 w-4" />
                {isSendingEmail ? "Sending..." : "Send Email"}
              </Button>
            )}
            {caseData.data.status === 'escalated_to_ombudsman' && (
              <Button
                onClick={() => navigate(`/cases/${caseId}/ombudsman-guide`)}
                variant="default"
                className="gap-2 w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                <FileText className="h-4 w-4" />
                Ombudsman Form Guide
              </Button>
            )}
          </div>

          {/* Case Info */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Case Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-500">Insurance Company</p>
                    <p className="font-medium text-sm sm:text-base truncate">
                      {caseData.data.insurance_company_name || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-500">Created</p>
                    <p className="font-medium text-sm sm:text-base">
                      {new Date(caseData.data.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {caseData.data.description && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700 text-sm sm:text-base whitespace-pre-wrap break-words">{caseData.data.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Documents</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {documentsData?.documents?.length || 0} documents uploaded
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              {/* Existing Documents */}
              {documentsData?.documents && documentsData.documents.length > 0 ? (
                <div className="space-y-2">
                  {documentsData.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-slate-50 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm truncate">{doc.file_name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {doc.document_type?.replace("_", " ")} •{" "}
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.file_url}
                        className="text-green-600 hover:text-green-700 p-2 flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4 text-sm">
                  No documents uploaded yet
                </p>
              )}

              {/* Upload New Documents */}
              <div className="border-t pt-4 space-y-3 sm:space-y-4">
                <h4 className="font-medium text-sm sm:text-base">Upload Additional Documents</h4>

                <div className="space-y-3">
                  {/* Document Type */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="documentType" className="text-xs sm:text-sm">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-sm">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add notes about this document..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  {/* File Input */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-9 sm:h-10 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Select Files
                    </Button>
                  </div>

                  {/* Selected Files */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Selected Files ({uploadingFiles.length})</Label>
                      {uploadingFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm truncate">{file.name}</span>
                            <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:inline">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleUpload}
                    disabled={uploadingFiles.length === 0 || uploadMutation.isPending}
                    className="w-full h-9 sm:h-10 text-sm"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {uploadingFiles.length > 0 ? `${uploadingFiles.length} ` : ""}Documents
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
