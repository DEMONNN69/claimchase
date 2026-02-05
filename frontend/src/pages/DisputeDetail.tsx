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
  Clock,
  X,
  ExternalLink,
  Plus,
  Send,
  Scale,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { disputeAPI } from "@/services/disputes";
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
  { value: "contract", label: "Contract" },
  { value: "receipt", label: "Receipt" },
  { value: "other", label: "Other" },
];

export default function DisputeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string>("other");
  const [docDescription, setDocDescription] = useState<string>("");

  // Fetch dispute details
  const {
    data: dispute,
    isLoading: disputeLoading,
    error: disputeError,
  } = useQuery({
    queryKey: ["dispute", id],
    queryFn: async () => {
      console.log("Fetching dispute with ID:", id);
      const result = await disputeAPI.get(Number(id!));
      console.log("Dispute API response:", result);
      return result.data; // Extract data from Axios response
    },
    enabled: !!id,
  });

  // Debug logging
  console.log("Current dispute data:", dispute);

  // Log specific fields to see their structure
  if (dispute) {
    console.log("Dispute fields:", {
      id: dispute.id,
      dispute_id: dispute.dispute_id,
      status: dispute.status,
      entity_data: dispute.entity_data,
      category_data: dispute.category_data,
      subcategory_data: dispute.subcategory_data,
      transaction_date: dispute.transaction_date,
      amount_involved: dispute.amount_involved,
      description: dispute.description,
      documents: dispute.documents,
      timeline: dispute.timeline,
      created_at: dispute.created_at,
    });
  }

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await disputeAPI.uploadDocument(Number(id!), file, selectedDocType, docDescription);
      return result.data; // Extract data from Axios response
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      // Refetch the main dispute data to get updated documents
      window.location.reload(); // Simple refresh for now
      setDocDescription("");
      setSelectedDocType("other");
      setUploadingFiles([]);
    },
    onError: (error: any) => {
      toast.error("Failed to upload document");
      setUploadingFiles([]);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(files);
  };

  const handleFileUpload = async () => {
    if (uploadingFiles.length === 0) return;

    for (const file of uploadingFiles) {
      try {
        await uploadDocumentMutation.mutateAsync(file);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(files => files.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { label: 'New', className: 'bg-blue-500' },
      'draft': { label: 'Draft', className: 'bg-gray-500' },
      'submitted': { label: 'Submitted', className: 'bg-blue-500' },
      'under_review': { label: 'Under Review', className: 'bg-yellow-500' },
      'resolved': { label: 'Resolved', className: 'bg-green-500' },
      'rejected': { label: 'Rejected', className: 'bg-red-500' },
      'escalated': { label: 'Escalated', className: 'bg-orange-500' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.new;
    return (
      <Badge className={`${config.className} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (disputeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (disputeError || !dispute) {
    console.log("Dispute error:", disputeError);
    console.log("Dispute data:", dispute);
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {disputeError ? 
              `Error: ${disputeError.message || 'Failed to load dispute'}` : 
              "The dispute you're looking for doesn't exist or you don't have permission to view it."
            }
          </p>
          <Button onClick={() => navigate('/disputes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Disputes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/disputes')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Disputes
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Dispute #{dispute.dispute_id || dispute.id}</h1>
            <p className="text-muted-foreground">
              Created on {dispute.created_at ? formatDate(dispute.created_at) : 'N/A'}
            </p>
          </div>
        </div>
        {dispute.status ? getStatusBadge(dispute.status) : <Badge className="bg-gray-500 text-white">Unknown</Badge>}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Dispute Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Entity</Label>
                  <p className="font-medium">{dispute.entity_data?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Category</Label>
                  <p className="font-medium">{dispute.category_data?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Subcategory</Label>
                  <p className="font-medium">{dispute.subcategory_data?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Amount Involved</Label>
                  <p className="font-medium">
                    {dispute.amount_involved ? 
                      `₹${Number(dispute.amount_involved).toLocaleString()}` : 
                      'N/A'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Transaction ID</Label>
                  <p className="font-medium">{dispute.transaction_id || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Transaction Date</Label>
                  <p className="font-medium">{dispute.transaction_date ? formatDate(dispute.transaction_date) : 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Description</Label>
                <p className="mt-1 p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                  {dispute.description || 'No description provided'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{dispute.status || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Priority</Label>
                  <p className="font-medium capitalize">{dispute.priority || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispute.timeline && dispute.timeline.length > 0 ? (
                <div className="space-y-4">
                  {dispute.timeline.map((event: any, index: number) => (
                    <div key={event.id || index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        {index < dispute.timeline.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{event.event_type?.replace('_', ' ') || event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.created_at)}
                        </p>
                        {event.description && (
                          <p className="text-sm mt-1">{event.description}</p>
                        )}
                        {event.performed_by_name && (
                          <p className="text-xs text-muted-foreground mt-1">by {event.performed_by_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No timeline events yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" variant="outline">
                <Send className="h-4 w-4" />
                Contact Entity
              </Button>
              <Button className="w-full gap-2" variant="outline">
                <Scale className="h-4 w-4" />
                Escalate Dispute
              </Button>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription>
                Upload supporting documents for your dispute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type</Label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
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
                <Label htmlFor="doc-description">Description (Optional)</Label>
                <Textarea
                  id="doc-description"
                  placeholder="Brief description of the document..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                />
                
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4" />
                  Select Files
                </Button>

                {/* Uploading Files Preview */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUploadingFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      onClick={handleFileUpload}
                      disabled={uploadDocumentMutation.isPending}
                      className="w-full gap-2"
                    >
                      {uploadDocumentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Documents
                    </Button>
                  </div>
                )}
              </div>

              {/* Existing Documents */}
              {dispute.documents && dispute.documents.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Uploaded Documents</Label>
                  <div className="space-y-2">
                    {dispute.documents.map((doc: any, index: number) => (
                      <div
                        key={doc.id || index}
                        className="flex items-center gap-2 p-2 border rounded-md"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                        </div>
                        {doc.file_url && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.location.href = doc.file_url}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}