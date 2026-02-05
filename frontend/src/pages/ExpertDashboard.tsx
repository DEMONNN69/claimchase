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
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import expertAPI from "@/services/expert";
import { useAuth } from "@/contexts/AuthContext";
import type { DisputeGroup } from "@/services/types";

export default function ExpertDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check if user is an expert
  if (!user?.is_expert) {
    navigate("/dashboard");
    return null;
  }

  // Check onboarding status
  const { data: onboardingCheck, isLoading: checkingOnboarding } = useQuery({
    queryKey: ['expert-onboarding-check'],
    queryFn: async () => {
      const response = await expertAPI.checkOnboarding();
      return response.data;
    },
  });

  // Redirect to onboarding if needed
  if (!checkingOnboarding && onboardingCheck?.needs_onboarding) {
    navigate("/expert/onboarding");
    return null;
  }

  const {
    data: dashboard,
    isLoading: loadingDashboard,
    refetch,
  } = useQuery({
    queryKey: ['expert-dashboard'],
    queryFn: async () => {
      const response = await expertAPI.getDashboard();
      return response.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['expert-stats'],
    queryFn: async () => {
      const response = await expertAPI.getStats();
      return response.data;
    },
  });

  if (checkingOnboarding || loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
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
      color: "bg-orange-500",
      bgLight: "bg-orange-50",
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
      color: "bg-red-500",
      bgLight: "bg-red-50",
    },
  ];

  // Filter disputes based on status
  const filteredDisputes = dashboard?.disputes?.filter((disputeGroup) => {
    if (statusFilter === "all") return true;
    return disputeGroup.assignments.some((a) => a.status === statusFilter);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Dispute Review
              </h1>
              <p className="text-sm text-slate-500">
                Welcome, {user?.first_name}
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
            All Disputes
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

        {/* Disputes List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredDisputes && filteredDisputes.length > 0 ? (
              filteredDisputes.map((disputeGroup) => (
                <DisputeCard
                  key={disputeGroup.dispute_id}
                  disputeGroup={disputeGroup}
                  onViewDetails={(assignmentId) =>
                    navigate(`/expert/assignment/${assignmentId}`)
                  }
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {statusFilter === "all"
                    ? "No dispute assignments yet"
                    : `No ${statusFilter.replace("_", " ")} disputes`}
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Check back later for new assignments
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Dispute Card Component
function DisputeCard({
  disputeGroup,
  onViewDetails,
}: {
  disputeGroup: DisputeGroup;
  onViewDetails: (assignmentId: number) => void;
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-amber-100 text-amber-700 border-amber-200",
          icon: Clock,
        };
      case "in_review":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: FileText,
        };
      case "completed":
        return {
          color: "bg-emerald-100 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: AlertCircle,
        };
      default:
        return {
          color: "bg-slate-100 text-slate-700 border-slate-200",
          icon: FileText,
        };
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
    >
      {/* Dispute Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {disputeGroup.dispute_number}
            </h3>
            <p className="text-sm text-slate-500">{disputeGroup.category}</p>
          </div>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
          {disputeGroup.assignments.length}{" "}
          {disputeGroup.assignments.length === 1 ? "Assignment" : "Assignments"}
        </span>
      </div>

      {/* Assignments */}
      <div className="space-y-2">
        {disputeGroup.assignments.map((assignment) => {
          const statusConfig = getStatusConfig(assignment.status);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => onViewDetails(assignment.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1",
                    statusConfig.color
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {assignment.status.replace("_", " ")}
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    {assignment.documents?.length || 0} document(s) to review
                  </p>
                  <p className="text-xs text-slate-400">
                    Assigned {new Date(assignment.assigned_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
