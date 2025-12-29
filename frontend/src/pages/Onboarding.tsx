import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const insurers = [
  { id: "hdfc", name: "HDFC ERGO", color: "bg-red-50" },
  { id: "icici", name: "ICICI Lombard", color: "bg-orange-50" },
  { id: "sbi", name: "SBI General", color: "bg-blue-50" },
  { id: "bajaj", name: "Bajaj Allianz", color: "bg-indigo-50" },
  { id: "max", name: "Max Bupa", color: "bg-green-50" },
  { id: "star", name: "Star Health", color: "bg-yellow-50" },
];

const issues = [
  { id: "rejected", label: "Claim Rejected" },
  { id: "delayed", label: "Delayed" },
  { id: "short", label: "Short Settlement" },
  { id: "other", label: "Other" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const canProceed = step === 1 ? selectedInsurer : selectedIssue;

  const handleNext = () => {
    if (step === 1 && selectedInsurer) {
      setStep(2);
    } else if (step === 2 && selectedIssue) {
      navigate("/dashboard");
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen page-padding flex flex-col md:items-center md:justify-center">
      <div className="w-full md:max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="flex gap-2">
              <div className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step >= 1 ? "bg-primary" : "bg-muted"
              )} />
              <div className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step >= 2 ? "bg-primary" : "bg-muted"
              )} />
            </div>
          </div>
          <span className="text-sm text-muted-foreground">Step {step}/2</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Select Your Insurer</h1>
              <p className="text-muted-foreground mb-6">Choose the insurance company you have a complaint against.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {insurers.map((insurer) => (
                  <button
                    key={insurer.id}
                    onClick={() => setSelectedInsurer(insurer.id)}
                    className={cn(
                      "relative p-4 rounded-2xl border-2 transition-all text-left",
                      selectedInsurer === insurer.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-lg font-bold",
                      insurer.color
                    )}>
                      {insurer.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm">{insurer.name}</span>
                    {selectedInsurer === insurer.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">What happened?</h1>
              <p className="text-muted-foreground mb-6">Tell us about your issue so we can help you better.</p>

              <div className="flex flex-wrap gap-3">
                {issues.map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue.id)}
                    className={cn(
                      "px-5 py-3 rounded-full border-2 font-medium transition-all",
                      selectedIssue === issue.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    {issue.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-background md:static md:mt-8">
          <Button 
            size="full" 
            onClick={handleNext}
            disabled={!canProceed}
            className="md:max-w-xs md:mx-auto"
          >
            {step === 2 ? "Create Case" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
