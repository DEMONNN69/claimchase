import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Plus, FileText, Edit2, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useInsuranceCompanies, useInsuranceTypes, useCases } from "@/hooks/useApi";
import { useTranslation } from 'react-i18next';
import { NotificationBell } from "@/components/NotificationBell";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
import {
  Dialog,                                                             
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import type { InsuranceCompany } from "@/services/types";

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { data: allCompanies = [] } = useInsuranceCompanies();
  const { data: insuranceTypes = [] } = useInsuranceTypes();
  const { data: cases = [], isLoading: casesLoading } = useCases();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<"company" | "problem" | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    user?.insurance_company && typeof user.insurance_company === 'object' 
      ? user.insurance_company.id 
      : null
  );
  const [selectedProblem, setSelectedProblem] = useState<string>(
    user?.problem_type || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const currentCompany = user?.insurance_company && typeof user.insurance_company === 'object'
    ? user.insurance_company
    : allCompanies.find(c => c.id === selectedCompanyId);
  const popularCompanies = allCompanies.slice(0, 6);
  const otherCompanies = allCompanies.slice(6);

  // Get the most recent case
  const activeCase = cases.length > 0 ? cases[0] : null;
  
  // Calculate case statistics
  const caseStats = {
    total: cases.length,
    draft: cases.filter(c => c.status === 'draft').length,
    active: cases.filter(c => ['submitted', 'in_review'].includes(c.status)).length,
    resolved: cases.filter(c => c.status === 'resolved').length,
  };

  const handleEditClick = (type: "company" | "problem") => {
    setEditType(type);
    // Set current user selection as default
    if (type === "company") {
      setSelectedCompanyId(user?.insurance_company && typeof user.insurance_company === 'object' ? user.insurance_company.id : null);
    } else {
      setSelectedProblem(user?.problem_type || "");
    }
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      const updateData: any = {};

      if (editType === "company") {
        updateData.insurance_company_id = selectedCompanyId;
      } else if (editType === "problem") {
        updateData.problem_type = selectedProblem;
      }

      await updateProfile(updateData);
      toast.success("Profile updated successfully!");
      setEditDialogOpen(false);
      setEditType(null);
    } catch (error: any) {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Show skeleton while loading
  if (casesLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Navbar - Only visible on mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 mb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate("/settings")}
              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
              aria-label="Settings"
            >
              {user?.first_name?.[0]?.toUpperCase() ?? "?"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 animate-fade-in space-y-6 max-w-full overflow-x-hidden">
        {/* Welcome Section */}
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold break-words">{t('dashboard:welcome_message')} {user?.first_name}!</h1>
          <p className="text-muted-foreground mt-2">{t('dashboard:tagline')}</p>
        </div>

        {/* Profile Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Insurance Company Card */}
          <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:insurance_company')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base lg:text-lg break-words">{currentCompany?.name || t('dashboard:not_selected')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('dashboard:selected_during_onboarding')}</p>
                </div>
                <button
                  onClick={() => handleEditClick("company")}
                  className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Problem Type Card */}
          <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:issue_type')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base lg:text-lg capitalize break-words">
                    {user?.problem_type?.replace(/_/g, " ") || t('dashboard:not_selected')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{t('dashboard:problem_facing')}</p>
                </div>
                <button
                  onClick={() => handleEditClick("problem")}
                  className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start New Grievance CTA */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 lg:p-6 border border-primary/20">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg lg:text-xl font-bold mb-2 break-words">{t('dashboard:ready_to_file')}</h2>
              <p className="text-muted-foreground text-sm lg:text-base">{t('dashboard:start_documenting')}</p>
            </div>
            <Button
              onClick={() => navigate("/start-grievance")}
              size="lg"
              className="gap-2 flex-shrink-0 w-full sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              {t('dashboard:new_grievance')}
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{t('dashboard:your_cases')}</p>
            <h2 className="text-xl lg:text-2xl font-bold break-words">{t('dashboard:cases_count')} {cases.length > 0 && `(${cases.length})`}</h2>
          </div>
        </div>

      {/* Active Cases Summary */}
      {activeCase ? (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{t('dashboard:active_cases')}</h2>
                  <p className="text-sm text-muted-foreground break-words">
                    You have {caseStats.total} {t('dashboard:case_stats.total_cases')} • {caseStats.draft} {t('dashboard:case_stats.drafts')} • {caseStats.active} {t('dashboard:case_stats.active')}
                  </p>
                </div>
                <Button onClick={() => navigate("/cases")} variant="outline" className="w-full sm:w-auto">
                  {t('dashboard:view_all_cases')}
                </Button>
              </div>
              
              {/* Most Recent Case */}
              <div className="bg-white rounded-lg p-4 border border-primary/10">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium break-words">{activeCase.case_number}</h3>
                    <p className="text-sm text-muted-foreground mb-2 break-words">{activeCase.subject}</p>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          activeCase.status === 'draft' ? 'bg-orange-500' :
                          activeCase.status === 'submitted' ? 'bg-green-500' :
                          activeCase.status === 'in_review' ? 'bg-green-100' :
                          activeCase.status === 'resolved' ? 'bg-green-500' : 'bg-gray-500'
                        )} />
                        <span className="capitalize">{activeCase.status.replace('_', ' ')}</span>
                      </div>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-muted-foreground">{formatDate(activeCase.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    {activeCase.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/drafter/${activeCase.id}`)}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <FileEdit className="h-4 w-4 mr-1" />
                        Edit Draft
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => navigate(`/cases/${activeCase.id}`)}
                      className="w-full sm:w-auto"
                    >
                      {t('dashboard:view_details')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      ) : (
        <Card className="mb-6 border-dashed">
          <CardContent className="p-8 text-center">
            <FileEdit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No cases yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start your first grievance to begin tracking your insurance claim.
            </p>
            <Button onClick={() => navigate("/start-grievance")} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Case
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Case Stats — inline pills */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-sm">
          <span className="font-semibold">{caseStats.total}</span>
          <span className="text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-50 rounded-full px-3 py-1.5 text-sm">
          <span className="font-semibold text-orange-600">{caseStats.draft}</span>
          <span className="text-orange-500">Draft</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 rounded-full px-3 py-1.5 text-sm">
          <span className="font-semibold text-green-600">{caseStats.active}</span>
          <span className="text-green-500">Active</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 rounded-full px-3 py-1.5 text-sm">
          <span className="font-semibold text-green-700">{caseStats.resolved}</span>
          <span className="text-green-600">Resolved</span>
        </div>
      </div>
     

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editType === "company" ? "Change Insurance Company" : "Change Issue Type"}
            </DialogTitle>
          </DialogHeader>

          {editType === "company" ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-3">Currently Selected: <span className="text-primary">{currentCompany?.name || "None"}</span></p>
                  <p className="text-sm font-medium mb-3">Popular Companies</p>
                  <div className="grid grid-cols-2 gap-2">
                    {popularCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => setSelectedCompanyId(company.id)}
                        className={cn(
                          "p-3 rounded-lg border text-sm text-left transition-all",
                          selectedCompanyId === company.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <p className="font-medium text-xs">{company.name}</p>
                        {selectedCompanyId === company.id && (
                          <CheckCircle className="h-4 w-4 mt-2 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {otherCompanies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3">All Companies</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {otherCompanies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => setSelectedCompanyId(company.id)}
                          className={cn(
                            "w-full p-2 rounded-lg border text-sm text-left transition-all",
                            selectedCompanyId === company.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <p className="font-medium text-sm">{company.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">Currently Selected: <span className="text-primary capitalize">{user?.problem_type?.replace(/_/g, " ") || "None"}</span></p>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {insuranceTypes.map((problem) => (
                  <button
                    key={problem.value}
                    onClick={() => setSelectedProblem(problem.value)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-sm text-left transition-all",
                      selectedProblem === problem.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{problem.label}</span>
                      {selectedProblem === problem.value && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
