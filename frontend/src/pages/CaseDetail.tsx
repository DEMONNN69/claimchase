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
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to upload document");
    },
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
      await uploadMutation.mutateAsync(file);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
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
    submitted: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">
                Case {caseData.data.case_number}
              </h1>
              <p className="text-slate-500 mt-1">{caseData.data.subject}</p>
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
            
            <Badge className={statusColors[caseData.data.status] || ""}>
              {caseData.data.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Case Info */}
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Insurance Company</p>
                    <p className="font-medium">
                      {caseData.data.insurance_company_name || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="font-medium">
                      {new Date(caseData.data.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {caseData.data.description && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700">{caseData.data.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    {documentsData?.documents?.length || 0} documents uploaded
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Documents */}
              {documentsData?.documents && documentsData.documents.length > 0 ? (
                <div className="space-y-2">
                  {documentsData.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {doc.document_type?.replace("_", " ")} •{" "}
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">
                  No documents uploaded yet
                </p>
              )}

              {/* Upload New Documents */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Upload Additional Documents</h4>

                <div className="space-y-3">
                  {/* Document Type */}
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add notes about this document..."
                      rows={2}
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
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Select Files
                    </Button>
                  </div>

                  {/* Selected Files */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Files ({uploadingFiles.length})</Label>
                      {uploadingFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-slate-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
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
                    className="w-full"
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
