import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Scale,
  User,
  Award,
  ChevronRight,
  Loader2,
  Check,
  Briefcase,
  Building2,
  ShoppingCart,
  Plane,
  Home,
  Smartphone,
  Utensils,
  GraduationCap,
} from "lucide-react";
import { expertAPI } from "@/services/expert";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// Expertise areas for consumer disputes
const expertiseAreas = [
  { value: "consumer_rights", label: "Consumer Rights", icon: Scale },
  { value: "ecommerce", label: "E-commerce Disputes", icon: ShoppingCart },
  { value: "banking_finance", label: "Banking & Finance", icon: Building2 },
  { value: "travel_tourism", label: "Travel & Tourism", icon: Plane },
  { value: "real_estate", label: "Real Estate", icon: Home },
  { value: "telecom", label: "Telecom Services", icon: Smartphone },
  { value: "food_hospitality", label: "Food & Hospitality", icon: Utensils },
  { value: "general", label: "General Disputes", icon: Briefcase },
];

export default function ExpertOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    expertise_area: "",
    years_of_experience: 0,
  });

  const onboard = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await expertAPI.updateProfile({
        years_of_experience: data.years_of_experience,
        bio: data.expertise_area,
      });
      return response.data;
    },
  });

  const canProceedStep1 = formData.expertise_area !== "";

  const handleSubmit = async () => {
    try {
      await onboard.mutateAsync(formData);
      toast.success("Welcome aboard! Your expert profile is set up.");
      navigate("/expert");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to complete onboarding"
      );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-green-500 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 mb-4">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, Expert!
          </h1>
          <p className="text-slate-500 mt-1">
            Let's set up your expert reviewer profile
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                step >= s ? "bg-green-100 scale-110" : "bg-slate-200"
              )}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8">
          {/* Step 1: Expertise Area */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Area of Expertise
                  </h2>
                  <p className="text-sm text-slate-500">
                    What type of disputes do you specialize in?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {expertiseAreas.map((area) => {
                  const Icon = area.icon;
                  const isSelected = formData.expertise_area === area.value;
                  return (
                    <motion.button
                      key={area.value}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setFormData({ ...formData, expertise_area: area.value })
                      }
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-green-500 bg-green-100"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          isSelected ? "text-green-700" : "text-slate-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-green-700" : "text-slate-700"
                        )}
                      >
                        {area.label}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-700 ml-auto" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full rounded-xl py-6 bg-gradient-to-r from-green-500 to-green-700"
              >
                Continue
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Your Experience</h2>
                  <p className="text-sm text-slate-500">
                    How many years have you worked in dispute resolution?
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-slate-700">Years of Experience</Label>
                  <div className="flex items-center gap-4 mt-3">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={formData.years_of_experience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          years_of_experience: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="w-16 text-center">
                      <span className="text-2xl font-bold text-slate-900">
                        {formData.years_of_experience}
                      </span>
                      <span className="text-sm text-slate-500 block">
                        years
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Profile Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name</span>
                      <span className="font-medium">
                        {user?.first_name} {user?.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expertise</span>
                      <span className="font-medium">
                        {expertiseAreas.find(
                          (a) => a.value === formData.expertise_area
                        )?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Experience</span>
                      <span className="font-medium">
                        {formData.years_of_experience} years
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl py-6"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={onboard.isPending}
                    className="flex-1 rounded-xl py-6 bg-gradient-to-r from-green-500 to-green-700"
                  >
                    {onboard.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <Check className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
