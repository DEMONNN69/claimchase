import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { FileEdit, Mail, Scale, Users, Check, Lock, ChevronRight, Plus, Clock, AlertCircle, Edit2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useInsuranceCompanies, useInsuranceTypes, useCases } from "@/hooks/useApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { InsuranceCompany } from "@/services/types";

interface StepProps {
  icon: React.ElementType;
  title: string;
  status: "complete" | "active" | "pending" | "locked";
  index: number;
  isLast?: boolean;
}

function Step({ icon: Icon, title, status, index, isLast }: StepProps) {
  const statusConfig = {
    complete: { bg: "bg-green-500", icon: Check, text: "Completed" },
    active: { bg: "bg-primary", icon: Icon, text: "In Progress" },
    pending: { bg: "bg-muted", icon: Icon, text: "Pending" },
    locked: { bg: "bg-muted", icon: Lock, text: "Locked" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white transition-all",
          config.bg,
          status === "pending" || status === "locked" ? "text-muted-foreground" : ""
        )}>
          <config.icon className="h-5 w-5" />
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 h-10 mt-2",
            status === "complete" ? "bg-green-500" : "bg-muted"
          )} />
        )}
      </div>
      <div className="flex-1 pb-4">
        <p className={cn(
          "font-medium",
          status === "locked" ? "text-muted-foreground" : "text-foreground"
        )}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{config.text}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
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

  // Determine case status steps based on actual case
  const getStepsFromCase = () => {
    if (!activeCase) {
      return [
        { icon: FileEdit, title: "Draft Grievance", status: "pending" as const },
        { icon: Mail, title: "Email Sent", status: "locked" as const },
        { icon: Scale, title: "Ombudsman", status: "locked" as const },
        { icon: Users, title: "Expert Handoff", status: "locked" as const },
      ];
    }

    const steps = [
      { 
        icon: FileEdit, 
        title: "Draft Grievance", 
        status: activeCase.status === 'draft' ? "active" as const : "complete" as const 
      },
      { 
        icon: Mail, 
        title: "Email Sent", 
        status: activeCase.status === 'submitted' || activeCase.status === 'under_review' ? "complete" as const : 
                activeCase.status === 'draft' ? "pending" as const : "locked" as const
      },
      { 
        icon: Scale, 
        title: "Ombudsman", 
        status: activeCase.status === 'escalated_to_ombudsman' ? "active" as const :
                activeCase.is_escalated_to_ombudsman ? "complete" as const : "locked" as const
      },
      { 
        icon: Users, 
        title: "Expert Handoff", 
        status: "locked" as const
      },
    ];

    return steps;
  };

  const steps = getStepsFromCase();

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'draft': { label: 'Draft', className: 'bg-orange-500/10 text-orange-500' },
      'submitted': { label: 'Submitted', className: 'bg-blue-500/10 text-blue-500' },
      'under_review': { label: 'Under Review', className: 'bg-purple-500/10 text-purple-500' },
      'rejected': { label: 'Rejected', className: 'bg-red-500/10 text-red-500' },
      'escalated_to_ombudsman': { label: 'Escalated', className: 'bg-orange-600/10 text-orange-600' },
      'resolved': { label: 'Resolved', className: 'bg-green-500/10 text-green-500' },
      'closed': { label: 'Closed', className: 'bg-gray-500/10 text-gray-500' },
    };
    return badges[status] || badges['draft'];
  };

  return (
    <div className="p-5 lg:p-8 animate-fade-in space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.first_name}!</h1>
        <p className="text-muted-foreground mt-2">Let's get your insurance grievance resolved.</p>
      </div>

      {/* Profile Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insurance Company Card */}
        <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Insurance Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-lg">{currentCompany?.name || "Not selected"}</p>
                <p className="text-sm text-muted-foreground mt-1">Selected during onboarding</p>
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
        <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issue Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-lg capitalize">
                  {user?.problem_type?.replace(/_/g, " ") || "Not selected"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Problem you're facing</p>
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
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-2">Ready to file a grievance?</h2>
            <p className="text-muted-foreground">Start documenting your insurance issue step by step.</p>
          </div>
          <Button
            onClick={() => navigate("/start-grievance")}
            size="lg"
            className="gap-2 flex-shrink-0"
          >
            <Plus className="h-5 w-5" />
            New Grievance
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your cases</p>
          <h2 className="text-2xl font-bold">Cases {cases.length > 0 && `(${cases.length})`}</h2>
        </div>
      </div>

      {/* Active Case Card or Empty State */}
      {casesLoading ? (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading your cases...</p>
          </CardContent>
        </Card>
      ) : activeCase ? (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Case #{activeCase.case_number}</p>
                <CardTitle className="text-xl">{activeCase.subject}</CardTitle>
              </div>
              <Badge className={cn("hover:bg-opacity-100", getStatusBadge(activeCase.status).className)}>
                <Clock className="h-3 w-3 mr-1" />
                {getStatusBadge(activeCase.status).label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              <div>
                <p className="text-muted-foreground text-xs">Company</p>
                <p className="font-medium">
                  {activeCase.insurance_company_data?.name || activeCase.insurance_company_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <p className="font-medium capitalize">{activeCase.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Priority</p>
                <p className="font-medium capitalize">{activeCase.priority}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="font-medium">{formatDate(activeCase.created_at)}</p>
              </div>
            </div>
            <Button 
              className="w-full sm:w-auto" 
              onClick={() => navigate(activeCase.status === 'draft' ? "/drafter" : `/cases/${activeCase.id}`)}
            >
              {activeCase.status === 'draft' ? 'Continue Draft' : 'View Case'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
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

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Progress Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {steps.map((step, index) => (
              <Step
                key={step.title}
                icon={step.icon}
                title={step.title}
                status={step.status}
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </CardContent>
        </Card>

        {/* Action Required */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCase ? (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                  <FileEdit className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {activeCase.status === 'draft' ? 'Complete Your Draft' : 'Review Your Case'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeCase.status === 'draft'
                      ? 'Your grievance email is ready to review. Make any final edits before sending.'
                      : `Your case is currently ${getStatusBadge(activeCase.status).label.toLowerCase()}. Check for updates.`}
                  </p>
                  <Button 
                    onClick={() => navigate(activeCase.status === 'draft' ? "/drafter" : `/cases/${activeCase.id}`)} 
                    variant="outline" 
                    className="gap-2"
                  >
                    {activeCase.status === 'draft' ? 'Open Drafter' : 'View Case'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Start Your First Case</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You haven't created any cases yet. Start your first grievance to get help with your insurance claim.
                  </p>
                  <Button onClick={() => navigate("/start-grievance")} variant="outline" className="gap-2">
                    Create Case
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: FileEdit, label: "Drafter", path: "/drafter" },
          { icon: Scale, label: "Guide", path: "/guide" },
          { icon: Users, label: "Get Help", path: "/handoff" },
          { icon: Mail, label: "Settings", path: "/settings" },
        ].map((action) => (
          <Card 
            key={action.label}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mb-2">
                <action.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </CardContent>
          </Card>
        ))}
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
  );
}
