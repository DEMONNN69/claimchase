import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useInsuranceCompanies, useInsuranceTypes } from "@/hooks/useApi";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import type { InsuranceCompany } from "@/services/types";

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch insurance types from backend
  const { data: insuranceTypes = [] } = useInsuranceTypes();
  
  // Form data
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    phone: "+91 ",
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string>("");
  const [otherProblemText, setOtherProblemText] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure +91 prefix is always present
    if (value.startsWith("+91 ")) {
      setProfileData(prev => ({ ...prev, phone: value }));
    } else if (value.startsWith("+91")) {
      setProfileData(prev => ({ ...prev, phone: "+91 " + value.slice(3) }));
    } else {
      setProfileData(prev => ({ ...prev, phone: "+91 " }));
    }
  };

  // Fetch insurance companies
  const { data: allCompanies = [], isLoading } = useInsuranceCompanies();
  
  // Filter companies by search
  const filteredCompanies = allCompanies.filter((company: InsuranceCompany) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Popular companies (first 6 or customize as needed)
  const popularCompanies = filteredCompanies.slice(0, 6);
  const otherCompanies = filteredCompanies.slice(6);

  const canProceed = 
    step === 1 ? profileData.first_name && profileData.last_name && profileData.phone.length > 4 :
    step === 2 ? selectedCompanyId :
    step === 3 ? selectedProblem && (selectedProblem !== "other" || otherProblemText.trim()) : false;

  const handleNext = async () => {
    if (step === 1 && canProceed) {
      setStep(2);
    } else if (step === 2 && canProceed) {
      setStep(3);
    } else if (step === 3 && canProceed) {
      try {
        setIsSaving(true);
        const problemValue = selectedProblem === "other" ? otherProblemText : selectedProblem;
        
        console.log('Saving profile with:', {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          insurance_company: selectedCompanyId,
          problem_type: problemValue,
        });
        
        await updateProfile({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          insurance_company_id: selectedCompanyId,
          problem_type: problemValue,
        });
        
        toast.success("Profile completed!");
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 100);
      } catch (error: any) {
        console.error('Profile update error:', error);
        toast.error(error.response?.data?.message || "Failed to save profile. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      navigate("/login");
    }
  }; 

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Panel - Branding (hidden on mobile for more form space) */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">ClaimChase</span>
        </div>
        <div className="text-white">
          <h2 className="text-3xl font-bold mb-4">
            Let's set up<br />your profile
          </h2>
          <p className="text-white/80">
            Quick setup to get you started with your insurance grievance.
          </p>
        </div>
        <div className="flex gap-2">
          <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 1 ? "bg-white" : "bg-white/30")} />
          <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 2 ? "bg-white" : "bg-white/30")} />
          <div className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= 3 ? "bg-white" : "bg-white/30")} />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex gap-2">
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 3 ? "bg-primary" : "bg-muted")} />
          </div>
          <span className="text-sm text-muted-foreground">{step}/3</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-12 overflow-auto">
          <div className="max-w-xl mx-auto">
            {/* Desktop back button */}
            <button 
              onClick={handleBack}
              className="hidden lg:flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </button>

            {step === 1 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Tell us about yourself</h1>
                <p className="text-muted-foreground mb-8">We need some basic info to get started.</p>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName"
                        placeholder="Saurabh"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="mt-2 h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName"
                        placeholder="Shukla"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="mt-2 h-11"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={profileData.phone}
                      onChange={handlePhoneChange}
                      onKeyDown={(e) => {
                        // Prevent deletion of +91 prefix
                        const input = e.currentTarget;
                        const cursorPos = input.selectionStart || 0;
                        if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPos <= 4) {
                          e.preventDefault();
                        }
                      }}
                      onFocus={(e) => {
                        // Move cursor after +91 if at the beginning
                        if (e.target.selectionStart === 0) {
                          e.target.setSelectionRange(4, 4);
                        }
                      }}
                      className="mt-2 h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Select Insurance Company</h1>
                <p className="text-muted-foreground mb-6">Choose the company you have a policy with.</p>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading companies...</div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No companies found.</div>
                ) : (
                  <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2">
                    {/* Popular Companies - Cards */}
                    {popularCompanies.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Popular Companies</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {popularCompanies.map((company: InsuranceCompany) => (
                            <Card
                              key={company.id}
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-md",
                                selectedCompanyId === company.id
                                  ? "ring-2 ring-primary bg-primary/5"
                                  : "hover:border-primary/50"
                              )}
                              onClick={() => setSelectedCompanyId(company.id)}
                            >
                              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                <p className="font-medium text-sm">{company.name}</p>
                                {selectedCompanyId === company.id && (
                                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Companies - List */}
                    {otherCompanies.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">All Companies</h3>
                        <div className="space-y-2">
                          {otherCompanies.map((company: InsuranceCompany) => (
                            <div
                              key={company.id}
                              className={cn(
                                "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                                selectedCompanyId === company.id
                                  ? "border-primary bg-primary/5"
                                  : "border-bordee"
                              )}
                              onClick={() => setSelectedCompanyId(company.id)}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{company.name}</p>
                                {selectedCompanyId === company.id && (
                                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">What's your problem?</h1>
                <p className="text-muted-foreground mb-6">Select the type of insurance issue you're facing.</p>

                <div className="space-y-3">
                  {insuranceTypes.map((problem) => (
                    <div
                      key={problem.value}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                        selectedProblem === problem.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                      onClick={() => setSelectedProblem(problem.value)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{problem.label}</p>
                        {selectedProblem === problem.value && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Other text field */}
                  {selectedProblem === "other" && (
                    <div className="mt-4 animate-fade-in">
                      <Label htmlFor="otherProblem">Please specify your problem</Label>
                      <Textarea
                        id="otherProblem"
                        placeholder="Describe your insurance issue..."
                        value={otherProblemText}
                        onChange={(e) => setOtherProblemText(e.target.value)}
                        className="mt-2 min-h-[100px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-6 lg:p-12 lg:pt-0 border-t lg:border-t-0">
          <div className="max-w-xl mx-auto">
            <Button 
              size="lg"
              className="w-full h-12"
              onClick={handleNext}
              disabled={!canProceed || isSaving}
            >
              {isSaving ? "Saving..." : step === 3 ? "Complete Setup" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
