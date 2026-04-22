import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
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
  Eye,
  Settings
} from "lucide-react";
import { useCases } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { CasesListSkeleton } from "@/components/LoadingSkeletons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const getProgressSteps = (status: string, t: any) => {
  const steps = [
    { name: t('progress_steps.draft_created'), completed: true },
    { name: t('progress_steps.submitted'), completed: ['submitted', 'in_review', 'resolved', 'rejected'].includes(status) },
    { name: t('progress_steps.under_review'), completed: ['in_review', 'resolved', 'rejected'].includes(status) },
    { name: t('progress_steps.resolved'), completed: ['resolved'].includes(status) },
  ];
  
  const currentStep = steps.filter(s => s.completed).length;
  return { currentStep, totalSteps: steps.length };
};

export default function Cases() {
  const navigate = useNavigate();
  const { t } = useTranslation('cases');
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { data: cases = [], isLoading } = useCases();

  // Status config that uses translations
  const statusConfig = {
    draft: { label: t('status.draft'), color: 'bg-orange-500/10 text-orange-600 border-orange-200', icon: FileEdit },
    submitted: { label: t('status.submitted'), color: 'bg-green-500/10 text-green-600 border-green-200', icon: Clock },
    in_review: { label: t('status.in_review'), color: 'bg-green-100/10 text-green-700 border-purple-200', icon: Clock },
    resolved: { label: t('status.resolved'), color: 'bg-green-500/10 text-green-600 border-green-200', icon: CheckCircle },
    rejected: { label: t('status.rejected'), color: 'bg-red-500/10 text-red-600 border-red-200', icon: AlertCircle },
  };

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
    return <CasesListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Mobile Navbar - Only visible on mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate("/settings")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">{t('title')}</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              {t('subtitle')}
            </p>
          </div>
          <Button 
            onClick={() => navigate("/start-grievance")}
            className="gap-2 mt-4 sm:mt-0 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {t('actions.new_case')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{cases.length}</p>
                <p className="text-xs sm:text-sm text-slate-600 leading-tight">{t('stats.total_cases')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {cases.filter((c: any) => c.status === 'draft').length}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-tight">{t('stats.draft')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {cases.filter((c: any) => ['submitted', 'in_review'].includes(c.status)).length}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-tight">{t('stats.active')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {cases.filter((c: any) => c.status === 'resolved').length}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-tight">{t('stats.resolved')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('search_placeholder')}
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
            <option value="all">{t('filters.all')}</option>
            <option value="draft">{t('filters.draft')}</option>
            <option value="submitted">{t('filters.submitted')}</option>
            <option value="in_review">{t('filters.in_review')}</option>
            <option value="resolved">{t('filters.resolved')}</option>
            <option value="rejected">{t('filters.rejected')}</option>
          </select>
        </div>

        {/* Cases List */}
        {filteredCases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">
                {searchQuery || statusFilter !== "all" ? t('empty_state.no_matches') : t('empty_state.no_cases')}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchQuery || statusFilter !== "all" 
                  ? t('empty_state.adjust_filters') 
                  : t('empty_state.start_first')}
              </p>
              {(!searchQuery && statusFilter === "all") && (
                <Button onClick={() => navigate("/start-grievance")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('empty_state.create_first')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCases.map((case_item: any, index: number) => {
              const progress = getProgressSteps(case_item.status, t);
              const statusInfo = statusConfig[case_item.status as keyof typeof statusConfig];
              
              return (
                <motion.div
                  key={case_item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Case Info */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                                  {t('case_number', { number: case_item.case_number })}
                                </h3>
                                <Badge className={cn("text-xs flex-shrink-0", statusInfo?.color)}>
                                  {statusInfo?.label}
                                </Badge>
                              </div>
                              <p className="text-slate-700 mb-2 text-sm line-clamp-2">{case_item.subject}</p>
                              
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                                {case_item.insurance_company_name && (
                                  <div className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{case_item.insurance_company_name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
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
                              {t('progress_text', { current: progress.currentStep, total: progress.totalSteps })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          {case_item.status === 'draft' && (
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/drafter/${case_item.id}`)}
                              className="gap-2 w-full sm:w-auto text-sm"
                            >
                              <FileEdit className="h-4 w-4" />
                              {t('actions.edit_draft')}
                            </Button>
                          )}
                          <Button
                            onClick={() => navigate(`/cases/${case_item.id}`)}
                            className="gap-2 w-full sm:w-auto text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            {t('actions.view_details')}
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