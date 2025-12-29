import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileEdit, Mail, Scale, Users, Check, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProps {
  icon: React.ElementType;
  title: string;
  status: "complete" | "active" | "pending" | "locked";
  index: number;
  isLast?: boolean;
}

function Step({ icon: Icon, title, status, index, isLast }: StepProps) {
  const statusStyles = {
    complete: "bg-success text-success-foreground",
    active: "bg-primary text-primary-foreground",
    pending: "bg-muted text-muted-foreground",
    locked: "bg-muted text-muted-foreground",
  };

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          statusStyles[status]
        )}>
          {status === "complete" ? (
            <Check className="h-5 w-5" />
          ) : status === "locked" ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 h-12 mt-2",
            status === "complete" ? "bg-success" : "bg-muted"
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn(
              "font-semibold",
              status === "locked" ? "text-muted-foreground" : "text-foreground"
            )}>
              {title}
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {status === "active" ? "In Progress" : status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Mock state - in real app this would come from global state
  const steps = [
    { icon: FileEdit, title: "Draft Grievance", status: "active" as const },
    { icon: Mail, title: "Mail Sent", status: "pending" as const },
    { icon: Scale, title: "Ombudsman", status: "locked" as const },
    { icon: Users, title: "Expert Handoff", status: "locked" as const },
  ];

  return (
    <div className="page-padding animate-fade-in">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-sm text-muted-foreground">Case #9821</p>
        <h1 className="text-2xl md:text-3xl font-bold">Mediclaim</h1>
      </div>

      {/* Desktop: Two column layout */}
      <div className="md:grid md:grid-cols-2 md:gap-6">
        {/* Progress Stepper */}
        <div className="card-base mb-6 md:mb-0">
          <h2 className="font-semibold mb-4">Progress</h2>
          <div className="pl-1">
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
          </div>
        </div>

        {/* Action Card */}
        <div className="card-base border-2 border-primary/20 bg-primary/5 h-fit">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileEdit className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Action Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Let's draft your formal grievance email to the insurance company.
              </p>
              <Button onClick={() => navigate("/drafter")} className="gap-2">
                Open Drafter
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
