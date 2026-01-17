import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronLeft,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Send,
  Building2,
  Eye,
  Check,
  X,
  HelpCircle,
} from "lucide-react";
import {
  useAssignment,
  useStartReview,
  useSubmitReview,
} from "@/hooks/useApi";
import type { AssignmentDocument } from "@/services/types";
import PDFViewer from "@/components/PDFViewer";

export default function AssignmentReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assignmentId = id ? parseInt(id) : null;

  const { data: assignment, isLoading, refetch } = useAssignment(assignmentId);
  const startReview = useStartReview();
  const submitReview = useSubmitReview();

  const [selectedDoc, setSelectedDoc] = useState<AssignmentDocument | null>(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    outcome: "" as "approved" | "rejected" | "needs_more_info" | "",
    comments: "",
    additional_info_requested: "",
  });

  // Start review on first load if pending
  useEffect(() => {
    if (assignment?.status === "pending") {
      startReview.mutate(assignment.id);
    }
  }, [assignment?.id, assignment?.status]);

  // Set first unreviewed document as selected
  useEffect(() => {
    if (assignment?.documents && !selectedDoc) {
      const unreviewedDoc = assignment.documents.find((d) => !d.is_reviewed);
      setSelectedDoc(unreviewedDoc || assignment.documents[0]);
    }
  }, [assignment?.documents]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500">Assignment not found</p>
          <Button onClick={() => navigate("/reviewer")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (!selectedDoc || !reviewForm.outcome) {
      toast.error("Please select an outcome");
      return;
    }

    if (!reviewForm.comments.trim()) {
      toast.error("Please add your comments");
      return;
    }

    if (
      reviewForm.outcome === "needs_more_info" &&
      !reviewForm.additional_info_requested.trim()
    ) {
      toast.error("Please specify what information is needed");
      return;
    }

    try {
      await submitReview.mutateAsync({
        assignment_document: selectedDoc.id,
        outcome: reviewForm.outcome,
        comments: reviewForm.comments,
        additional_info_requested: reviewForm.additional_info_requested || undefined,
      });

      toast.success("Review submitted successfully");
      setShowReviewPanel(false);
      setReviewForm({ outcome: "", comments: "", additional_info_requested: "" });

      // Refetch and move to next doc
      await refetch();

      // Find next unreviewed document
      const nextDoc = assignment.documents?.find(
        (d) => d.id !== selectedDoc.id && !d.is_reviewed
      );
      if (nextDoc) {
        setSelectedDoc(nextDoc);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to submit review"
      );
    }
  };

  const reviewedCount = assignment.documents?.filter((d) => d.is_reviewed).length || 0;
  const totalCount = assignment.documents?.length || 0;
  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  const outcomeButtons = [
    { value: "approved", label: "Approve", icon: CheckCircle2, color: "emerald" },
    { value: "rejected", label: "Reject", icon: XCircle, color: "red" },
    { value: "needs_more_info", label: "Need Info", icon: HelpCircle, color: "amber" },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/reviewer")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-slate-900">
                  {assignment.case_number}
                </h1>
                <p className="text-sm text-slate-500">
                  {assignment.insurance_company}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {reviewedCount}/{totalCount} reviewed
                </p>
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Document List - Sidebar on desktop, top on mobile */}
        <div className="lg:w-80 bg-white border-b lg:border-b-0 lg:border-r overflow-x-auto lg:overflow-y-auto">
          <div className="p-3 lg:p-4">
            <h2 className="text-sm font-medium text-slate-500 mb-3 hidden lg:block">
              Documents ({totalCount})
            </h2>
            <div className="flex lg:flex-col gap-2 lg:gap-2">
              {assignment.documents?.map((doc) => (
                <DocumentTab
                  key={doc.id}
                  doc={doc}
                  isSelected={selectedDoc?.id === doc.id}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setShowReviewPanel(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedDoc ? (
            <>
              {/* Document Info Bar */}
              <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {selectedDoc.document_details.file_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedDoc.document_details.document_type} •{" "}
                      {(selectedDoc.document_details.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedDoc.document_details.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {!selectedDoc.is_reviewed && (
                    <Button
                      size="sm"
                      onClick={() => setShowReviewPanel(true)}
                      className="rounded-full ml-2"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  )}
                </div>
              </div>

              {/* Document Preview */}
              <div className="flex-1 relative bg-slate-100">
                {selectedDoc.document_details.file_type?.includes("pdf") ? (
                  <PDFViewer
                    url={selectedDoc.document_details.file_url}
                    fileName={selectedDoc.document_details.file_name}
                    className="w-full h-full min-h-[500px]"
                  />
                ) : selectedDoc.document_details.file_type?.startsWith("image/") ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={selectedDoc.document_details.file_url}
                      alt={selectedDoc.document_details.file_name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">
                        Preview not available for this file type
                      </p>
                      <a
                        href={selectedDoc.document_details.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Download to view
                      </a>
                    </div>
                  </div>
                )}

                {/* Already Reviewed Overlay */}
                {selectedDoc.is_reviewed && selectedDoc.review && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4">
                    <div className="flex items-start gap-3">
                      {selectedDoc.review.outcome === "approved" && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      {selectedDoc.review.outcome === "rejected" && (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      {selectedDoc.review.outcome === "needs_more_info" && (
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {selectedDoc.review.outcome === "approved" && "Approved"}
                          {selectedDoc.review.outcome === "rejected" && "Rejected"}
                          {selectedDoc.review.outcome === "needs_more_info" &&
                            "Needs More Information"}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {selectedDoc.review.comments}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">Select a document to review</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Panel - Slides up from bottom on mobile */}
      <AnimatePresence>
        {showReviewPanel && selectedDoc && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowReviewPanel(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto"
            >
              <div className="p-4 md:p-6">
                {/* Handle */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Submit Review
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowReviewPanel(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-5">
                  {/* Outcome Selection */}
                  <div>
                    <Label className="text-slate-700 mb-3 block">
                      Your Decision
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {outcomeButtons.map((btn) => {
                        const Icon = btn.icon;
                        const isSelected = reviewForm.outcome === btn.value;
                        return (
                          <button
                            key={btn.value}
                            onClick={() =>
                              setReviewForm({ ...reviewForm, outcome: btn.value })
                            }
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                              isSelected
                                ? btn.color === "emerald"
                                  ? "border-emerald-500 bg-emerald-50"
                                  : btn.color === "red"
                                  ? "border-red-500 bg-red-50"
                                  : "border-amber-500 bg-amber-50"
                                : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-6 w-6",
                                isSelected
                                  ? btn.color === "emerald"
                                    ? "text-emerald-600"
                                    : btn.color === "red"
                                    ? "text-red-600"
                                    : "text-amber-600"
                                  : "text-slate-400"
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-slate-900" : "text-slate-600"
                              )}
                            >
                              {btn.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <Label className="text-slate-700 mb-2 block">
                      Comments <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={reviewForm.comments}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, comments: e.target.value })
                      }
                      placeholder="Add your observations and comments..."
                      className="min-h-[100px] rounded-xl resize-none"
                    />
                  </div>

                  {/* Additional Info (if needs more info) */}
                  {reviewForm.outcome === "needs_more_info" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <Label className="text-slate-700 mb-2 block">
                        What information is needed?{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        value={reviewForm.additional_info_requested}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            additional_info_requested: e.target.value,
                          })
                        }
                        placeholder="Specify what additional documents or information is required..."
                        className="min-h-[80px] rounded-xl resize-none"
                      />
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitReview.isPending}
                    className="w-full py-6 rounded-xl text-base"
                  >
                    {submitReview.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Submit Review
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Document Tab Component
function DocumentTab({
  doc,
  isSelected,
  onClick,
}: {
  doc: AssignmentDocument;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all text-left min-w-[200px] lg:min-w-0 lg:w-full",
        isSelected
          ? "bg-blue-50 border-2 border-blue-200"
          : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          doc.is_reviewed
            ? doc.review?.outcome === "approved"
              ? "bg-emerald-100"
              : doc.review?.outcome === "rejected"
              ? "bg-red-100"
              : "bg-amber-100"
            : "bg-slate-200"
        )}
      >
        {doc.is_reviewed ? (
          doc.review?.outcome === "approved" ? (
            <Check className="h-5 w-5 text-emerald-600" />
          ) : doc.review?.outcome === "rejected" ? (
            <X className="h-5 w-5 text-red-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )
        ) : (
          <FileText className="h-5 w-5 text-slate-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isSelected ? "text-blue-900" : "text-slate-900"
          )}
        >
          {doc.document_details.file_name}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {doc.document_details.document_type}
        </p>
      </div>
    </motion.button>
  );
}
