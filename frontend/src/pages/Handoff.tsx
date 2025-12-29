import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Shield, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const benefits = [
  { icon: Shield, text: "Expert legal team handles your case" },
  { icon: Clock, text: "Average resolution in 45 days" },
  { icon: CheckCircle, text: "85% success rate on escalations" },
];

export default function Handoff() {
  const navigate = useNavigate();

  const handleUnlock = () => {
    toast.success("Thank you! Our team will contact you within 24 hours.");
  };

  return (
    <div className="min-h-screen premium-bg relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 md:w-72 md:h-72 bg-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative page-padding min-h-screen flex flex-col md:items-center md:justify-center">
        <div className="md:max-w-xl md:w-full">
          {/* Header */}
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-12"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Dashboard</span>
          </button>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {/* Crown Icon */}
            <div className="mb-8 p-5 md:p-6 bg-gold/20 rounded-full backdrop-blur-sm">
              <Crown className="h-12 w-12 md:h-16 md:w-16 text-gold" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 leading-tight">
              Grievance rejected?
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 mb-8">
              Let ClaimChase take over.
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-12 w-full max-w-xs md:max-w-md">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 text-left bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4"
                >
                  <benefit.icon className="h-5 w-5 text-gold flex-shrink-0" />
                  <span className="text-sm md:text-base text-primary-foreground/90">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pb-8 md:flex md:justify-center">
            <Button 
              size="full"
              onClick={handleUnlock}
              className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold md:max-w-xs"
            >
              <Crown className="h-4 w-4 mr-2" />
              Unlock Professional Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
