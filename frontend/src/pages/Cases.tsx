import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  FileEdit,
  Eye
} from "lucide-react";
import { useCases } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-orange-500/10 text-orange-600 border-orange-200', icon: FileEdit },
  submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Clock },
  in_review: { label: 'In Review', color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-500/10 text-green-600 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-200', icon: AlertCircle },
};

const getProgressSteps = (status: string) => {
  const steps = [
    { name: 'Draft Created', completed: true },
    { name: 'Submitted', completed: ['submitted', 'in_review', 'resolved', 'rejected'].includes(status) },
    { name: 'Under Review', completed: ['in_review', 'resolved', 'rejected'].includes(status) },
    { name: 'Resolved', completed: ['resolved'].includes(status) },
  ];
  
  const currentStep = steps.filter(s => s.completed).length;
  return { currentStep, totalSteps: steps.length };
};

export default function Cases() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { data: cases = [], isLoading } = useCases();

  // Filter cases based on search and status
  const filteredCases = cases.filter((case_item: any) => {
    const matchesSearch = case_item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         case_item.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         case_item.insurance_company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || case_item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Cases</h1>
            <p className="text-slate-600 mt-1">
              Manage and track your insurance grievances
            </p>
          </div>
          <Button 
            onClick={() => navigate("/start-grievance")}
            className="gap-2 mt-4 sm:mt-0"
          >
            <Plus className="h-4 w-4" />
            New Case
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
                <p className="text-sm text-slate-600">Total Cases</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {cases.filter((c: any) => c.status === 'draft').length}
                </p>
                <p className="text-sm text-slate-600">Draft</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {cases.filter((c: any) => ['submitted', 'in_review'].includes(c.status)).length}
                </p>
                <p className="text-sm text-slate-600">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {cases.filter((c: any) => c.status === 'resolved').length}
                </p>
                <p className="text-sm text-slate-600">Resolved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Cases List */}
        {filteredCases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">
                {searchQuery || statusFilter !== "all" ? "No matching cases" : "No cases yet"}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Start your first grievance to begin tracking your claims"}
              </p>
              {(!searchQuery && statusFilter === "all") && (
                <Button onClick={() => navigate("/start-grievance")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Case
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCases.map((case_item: any, index: number) => {
              const progress = getProgressSteps(case_item.status);
              const statusInfo = statusConfig[case_item.status as keyof typeof statusConfig];
              
              return (
                <motion.div
                  key={case_item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Case Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-900">
                                  {case_item.case_number}
                                </h3>
                                <Badge className={cn("text-xs", statusInfo?.color)}>
                                  {statusInfo?.label}
                                </Badge>
                              </div>
                              <p className="text-slate-700 mb-2">{case_item.subject}</p>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                {case_item.insurance_company_name && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {case_item.insurance_company_name}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(case_item.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.currentStep / progress.totalSteps) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              Step {progress.currentStep} of {progress.totalSteps}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {case_item.status === 'draft' && (
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/drafter/${case_item.id}`)}
                              className="gap-2"
                            >
                              <FileEdit className="h-4 w-4" />
                              Edit Draft
                            </Button>
                          )}
                          <Button
                            onClick={() => navigate(`/cases/${case_item.id}`)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}