import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center page-padding">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm md:max-w-lg">
        {/* Shield Illustration */}
        <div className="mb-8 p-6 md:p-8 bg-primary/10 rounded-full">
          <Shield className="h-20 w-20 md:h-28 md:w-28 text-primary" strokeWidth={1.5} />
        </div>

        {/* Hero Text */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
          Don't fight insurance alone.
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mb-10">
          We help you draft grievances, track claims, and escalate to the Ombudsman.
        </p>

        {/* CTA */}
        <Button 
          size="full" 
          onClick={() => navigate("/login")}
          className="mb-6 md:max-w-xs"
        >
          Start Grievance
        </Button>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pb-8">
        Not legal advice. Guidance only.
      </p>
    </div>
  );
}
