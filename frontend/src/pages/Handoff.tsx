import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Shield, Clock, CheckCircle, Sparkles, Phone, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const benefits = [
  { icon: Shield, title: "Expert Team", text: "Legal experts handle your case" },
  { icon: Clock, title: "Fast Resolution", text: "Average 45 days turnaround" },
  { icon: CheckCircle, title: "High Success", text: "85% success rate" },
];

const plans = [
  {
    name: "Basic",
    price: "₹999",
    features: ["Document review", "Email support", "Basic guidance"],
    popular: false,
  },
  {
    name: "Pro",
    price: "₹2,999",
    features: ["Everything in Basic", "Legal drafting", "Priority support", "Ombudsman filing"],
    popular: true,
  },
];

export default function Handoff() {
  const navigate = useNavigate();

  const handleUnlock = (plan: string) => {
    toast.success(`${plan} plan selected! Our team will contact you within 24 hours.`);
  };

  return (
    <div className="p-5 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Get Expert Help</h1>
          <p className="text-sm text-muted-foreground">Let professionals handle your case</p>
        </div>
      </div>

      {/* Hero Card */}
      <Card className="mb-6 bg-gradient-to-br from-primary to-primary/80 text-white border-0">
        <CardContent className="p-6 lg:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <Crown className="h-8 w-8" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold mb-2">Grievance Rejected?</h2>
          <p className="text-white/80 mb-4">Let ClaimChase experts take over your case.</p>
          <Badge className="bg-white/20 hover:bg-white/20 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            Premium Service
          </Badge>
        </CardContent>
      </Card>

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {benefits.map((benefit) => (
          <Card key={benefit.title} className="text-center">
            <CardContent className="p-4">
              <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-xs">{benefit.title}</p>
              <p className="text-xs text-muted-foreground">{benefit.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plans */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={plan.popular ? "border-2 border-primary" : ""}
          >
            <CardContent className="p-5">
              {plan.popular && (
                <Badge className="mb-3 bg-primary">Most Popular</Badge>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="text-2xl font-bold text-primary mb-4">{plan.price}</p>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleUnlock(plan.name)}
              >
                Choose {plan.name}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Need help choosing?</p>
              <p className="text-xs text-muted-foreground">Call us: 1800-123-4567</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">Call Now</Button>
        </CardContent>
      </Card>
    </div>
  );
}
