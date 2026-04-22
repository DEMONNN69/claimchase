import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  Building2,
  FolderOpen,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  useReviewerDashboard,
  useReviewerStats,
  useCheckOnboarding,
} from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import type { CaseGroup } from "@/services/types";

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check onboarding status
  const { data: onboardingCheck, isLoading: checkingOnboarding } =
    useCheckOnboarding();

  // Redirect to onboarding if needed
  if (!checkingOnboarding && onboardingCheck?.needs_onboarding) {
    navigate("/reviewer/onboarding");
    return null;
  }

  const {
    data: dashboard,
    isLoading: loadingDashboard,
    refetch,
  } = useReviewerDashboard();
  const { data: stats } = useReviewerStats();

  if (checkingOnboarding || loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin mx-auto" />
          <p className="text-slate-500 mt-3">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Pending",
      value: dashboard?.pending_count || 0,
      icon: Clock,
      color: "bg-amber-500",
      bgLight: "bg-amber-50",
    },
    {
      label: "In Progress",
      value: dashboard?.in_progress_count || 0,
      icon: FileText,
      color: "bg-green-500",
      bgLight: "bg-green-50",
    },
    {
      label: "Completed",
      value: dashboard?.completed_count || 0,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50",
    },
    {
      label: "Needs Info",
      value: dashboard?.needs_info_count || 0,
      icon: AlertCircle,
      color: "bg-orange-500",
      bgLight: "bg-orange-50",
    },
  ];

  // Filter cases based on status
  const filteredCases = dashboard?.cases?.filter((caseGroup) => {
    if (statusFilter === "all") return true;
    return caseGroup.assignments.some((a) => a.status === statusFilter);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Medical Review
              </h1>
              <p className="text-sm text-slate-500">
                Welcome, Dr. {onboardingCheck?.profile?.full_name || user?.first_name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="text-slate-500"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-md",
                  stat.bgLight
                )}
                onClick={() =>
                  setStatusFilter(stat.label.toLowerCase().replace(" ", "_"))
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      stat.color
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="rounded-full shrink-0"
          >
            All Cases
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className="rounded-full shrink-0"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("in_progress")}
            className="rounded-full shrink-0"
          >
            In Progress
          </Button>
        </div>

        {/* Cases List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredCases && filteredCases.length > 0 ? (
              filteredCases.map((caseGroup) => (
                <CaseCard
                  key={caseGroup.case_id}
                  caseGroup={caseGroup}
                  onViewDetails={(assignmentId) =>
                    navigate(`/reviewer/assignment/${assignmentId}`)
                  }
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">
                  No assignments yet
                </h3>
                <p className="text-slate-500 mt-1">
                  When documents are assigned for your review, they'll appear
                  here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Performance Stats */}
        {stats && stats.total_documents_reviewed > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-5"
          >
            <h3 className="font-semibold text-slate-900 mb-4">
              Your Performance
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.total_documents_reviewed}
                </p>
                <p className="text-xs text-slate-500">Documents Reviewed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.total_documents_reviewed > 0
                    ? Math.round(
                        (stats.approved_count / stats.total_documents_reviewed) *
                          100
                      )
                    : 0}
                  %
                </p>
                <p className="text-xs text-slate-500">Approval Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {stats.avg_review_time_hours.toFixed(1)}h
                </p>
                <p className="text-xs text-slate-500">Avg Review Time</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

// Case Card Component
function CaseCard({
  caseGroup,
  onViewDetails,
}: {
  caseGroup: CaseGroup;
  onViewDetails: (assignmentId: number) => void;
}) {
  const totalDocs = caseGroup.assignments.reduce(
    (sum, a) => sum + a.document_count,
    0
  );
  const reviewedDocs = caseGroup.assignments.reduce(
    (sum, a) => sum + a.reviewed_count,
    0
  );
  const progress = totalDocs > 0 ? (reviewedDocs / totalDocs) * 100 : 0;

  // Get the main assignment (first one)
  const mainAssignment = caseGroup.assignments[0];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-green-100 text-green-700",
    completed: "bg-emerald-100 text-emerald-700",
    needs_more_info: "bg-orange-100 text-orange-700",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {caseGroup.insurance_company}
              </p>
              <p className="text-sm text-slate-500">
                Case: {caseGroup.case_number}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              statusColors[mainAssignment.status]
            )}
          >
            {mainAssignment.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Documents count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              {totalDocs} document{totalDocs !== 1 ? "s" : ""} to review
            </span>
          </div>
          <span className="text-sm font-medium text-slate-900">
            {reviewedDocs}/{totalDocs} reviewed
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-green-500 to-green-700 rounded-full"
          />
        </div>

        {/* Action button */}
        <Button
          onClick={() => onViewDetails(mainAssignment.id)}
          className="w-full rounded-xl"
        >
          {mainAssignment.status === "pending"
            ? "Start Review"
            : mainAssignment.status === "in_progress"
            ? "Continue Review"
            : "View Details"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
