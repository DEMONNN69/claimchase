import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Stethoscope,
  User,
  Award,
  ChevronRight,
  Loader2,
  Check,
  Heart,
  Brain,
  Bone,
  Activity,
  Eye,
  Baby,
} from "lucide-react";
import { useOnboard } from "@/hooks/useApi";

// Specialization options with icons
const specializations = [
  { value: "general_medicine", label: "General Medicine", icon: Activity },
  { value: "cardiology", label: "Cardiology", icon: Heart },
  { value: "orthopedics", label: "Orthopedics", icon: Bone },
  { value: "neurology", label: "Neurology", icon: Brain },
  { value: "pediatrics", label: "Pediatrics", icon: Baby },
  { value: "ophthalmology", label: "Ophthalmology", icon: Eye },
  { value: "surgery", label: "General Surgery", icon: Stethoscope },
  { value: "other", label: "Other", icon: Stethoscope },
];

export default function ReviewerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    specialization: "",
    other_specialization: "",
    years_of_experience: 0,
  });

  const onboard = useOnboard();

  const canProceedStep1 = formData.full_name.trim().length >= 3;
  const canProceedStep2 = formData.specialization !== "";
  const canProceedStep3 =
    formData.specialization !== "other" ||
    formData.other_specialization.trim().length >= 2;

  const handleSubmit = async () => {
    try {
      await onboard.mutateAsync({
        full_name: formData.full_name,
        specialization: formData.specialization,
        other_specialization: formData.other_specialization || undefined,
        years_of_experience: formData.years_of_experience,
      });
      toast.success("Welcome aboard, Doctor! Your profile is set up.");
      navigate("/reviewer");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to complete onboarding"
      );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, Doctor!
          </h1>
          <p className="text-slate-500 mt-1">
            Let's set up your reviewer profile
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                step >= s ? "bg-blue-500 scale-110" : "bg-slate-200"
              )}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8">
          {/* Step 1: Name */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Your Name</h2>
                  <p className="text-sm text-slate-500">
                    How should we address you?
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name" className="text-slate-700">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Dr. John Smith"
                    className="mt-1.5 rounded-xl border-slate-200 focus:border-blue-500"
                  />
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full rounded-xl py-6 bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  Continue
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Specialization */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Specialization
                  </h2>
                  <p className="text-sm text-slate-500">
                    What's your area of expertise?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {specializations.map((spec) => {
                  const Icon = spec.icon;
                  const isSelected = formData.specialization === spec.value;
                  return (
                    <motion.button
                      key={spec.value}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setFormData({ ...formData, specialization: spec.value })
                      }
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          isSelected ? "text-indigo-600" : "text-slate-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-indigo-700" : "text-slate-700"
                        )}
                      >
                        {spec.label}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-indigo-600 ml-auto" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {formData.specialization === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-6"
                >
                  <Label className="text-slate-700">
                    Specify your specialization
                  </Label>
                  <Input
                    value={formData.other_specialization}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        other_specialization: e.target.value,
                      })
                    }
                    placeholder="e.g., Nephrology"
                    className="mt-1.5 rounded-xl"
                  />
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl py-6"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2 || !canProceedStep3}
                  className="flex-1 rounded-xl py-6 bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  Continue
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Experience</h2>
                  <p className="text-sm text-slate-500">
                    How many years have you practiced?
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
                      className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-500"
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
                        Dr. {formData.full_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Specialization</span>
                      <span className="font-medium">
                        {formData.specialization === "other"
                          ? formData.other_specialization
                          : specializations.find(
                              (s) => s.value === formData.specialization
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
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl py-6"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={onboard.isPending}
                    className="flex-1 rounded-xl py-6 bg-gradient-to-r from-blue-500 to-indigo-600"
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
