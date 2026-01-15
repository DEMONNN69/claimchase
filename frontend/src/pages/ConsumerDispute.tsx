import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Plane,
  Wallet,
  Building2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  MessageCircle,
  Shield,
  Clock,
  Sparkles,
  Check,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  useDisputeCategories,
  useSubcategories,
  useEntitiesByCategory,
  useCreateDispute,
  useUploadDisputeDocument,
} from "@/hooks/useApi";

// Category icons
const categoryIcons: Record<string, any> = {
  "online-shopping": ShoppingBag,
  airlines: Plane,
  "online-portals": Building2,
  wallet: Wallet,
  default: HelpCircle,
};

// Friendly messages for each step
const stepMessages = {
  1: { greeting: "Hey there! 👋", question: "What's troubling you today?" },
  2: { greeting: "Got it!", question: "Can you narrow it down?" },
  3: { greeting: "Almost there!", question: "Who are we dealing with?" },
  4: { greeting: "Tell us more", question: "What happened?" },
  5: { greeting: "Last step! 🎉", question: "Any extra details?" },
  6: { greeting: "All done!", question: "Here's your summary" },
};

export default function ConsumerDispute() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [selectedEntityName, setSelectedEntityName] = useState("");
  const [description, setDescription] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [contactMethod, setContactMethod] = useState<"phone" | "email" | "whatsapp">("email");
  const [documents, setDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API hooks
  const { data: categories, isLoading: loadingCategories } = useDisputeCategories();
  const { data: subcategories, isLoading: loadingSubs } = useSubcategories(selectedCategory);
  const { data: entities, isLoading: loadingEntities } = useEntitiesByCategory(selectedSubcategory || selectedCategory);
  const createDispute = useCreateDispute();
  const uploadDocument = useUploadDisputeDocument();

  // Auto-focus textarea on step 4
  useEffect(() => {
    if (step === 4 && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [step]);

  // Navigation
  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 6));
  };

  const goBack = () => {
    if (step === 1) {
      navigate("/disputes");
    } else {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  // Category selection
  const selectCategory = (id: number, name: string, slug: string) => {
    setSelectedCategory(id);
    setSelectedCategoryName(name);
    setSelectedSubcategory(null);
    setSelectedSubcategoryName("");
    setSelectedEntity(null);
    setSelectedEntityName("");
    setTimeout(goNext, 200);
  };

  // Subcategory selection
  const selectSubcategory = (id: number, name: string) => {
    setSelectedSubcategory(id);
    setSelectedSubcategoryName(name);
    setSelectedEntity(null);
    setSelectedEntityName("");
    setTimeout(goNext, 200);
  };

  // Entity selection
  const selectEntity = (id: number | null, name: string) => {
    setSelectedEntity(id);
    setSelectedEntityName(name);
    setTimeout(goNext, 200);
  };

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments((prev) => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit
  const handleSubmit = async () => {
    if (description.length < 10) {
      toast.error("Please describe what happened (at least 10 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        category: selectedCategory!, // Always send the top-level category
        subcategory: selectedSubcategory || undefined, // Send subcategory separately
        entity: selectedEntity || undefined,
        title: `${selectedCategoryName} Issue${selectedEntityName ? ` - ${selectedEntityName}` : ""}`,
        description,
        transaction_id: transactionId || undefined,
        amount_involved: amount ? parseFloat(amount) : undefined,
        preferred_contact_method: contactMethod,
      };

      const response = await createDispute.mutateAsync(data);
      const disputeId = response.data?.id;

      // Upload documents
      if (disputeId && documents.length > 0) {
        for (const doc of documents) {
          await uploadDocument.mutateAsync({ disputeId, file: doc, documentType: "evidence" });
        }
      }

      toast.success("Your complaint has been submitted! We'll be in touch soon.");
      setTimeout(() => navigate("/disputes"), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
  };

  // Progress calculation
  const progress = ((step - 1) / 5) * 100;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Step {step}/5</span>
          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {/* Step Content */}
            {step === 1 && (
              <StepWrapper
                greeting={stepMessages[1].greeting}
                question={stepMessages[1].question}
              >
                {loadingCategories ? (
                  <LoadingState />
                ) : (
                  <div className="space-y-3">
                    {categories?.map((cat) => {
                      const IconComp = categoryIcons[cat.slug] || categoryIcons.default;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <motion.button
                          key={cat.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectCategory(cat.id, cat.name, cat.slug)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                          )}
                        >
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                              isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            <IconComp className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{cat.name}</p>
                            <p className="text-sm text-slate-500">
                              {cat.slug === "online-shopping" && "Amazon, Flipkart, Myntra..."}
                              {cat.slug === "airlines" && "Flight issues, refunds..."}
                              {cat.slug === "online-portals" && "Paytm, PhonePe, GPay..."}
                              {!["online-shopping", "airlines", "online-portals"].includes(cat.slug) && "Tap to select"}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </StepWrapper>
            )}

            {step === 2 && (
              <StepWrapper
                greeting={stepMessages[2].greeting}
                question={stepMessages[2].question}
                subtitle={`Related to ${selectedCategoryName}`}
              >
                {loadingSubs ? (
                  <LoadingState />
                ) : subcategories && subcategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subcategories.map((sub) => (
                      <motion.button
                        key={sub.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => selectSubcategory(sub.id, sub.name)}
                        className={cn(
                          "px-4 py-3 rounded-full border-2 font-medium transition-all",
                          selectedSubcategory === sub.id
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        )}
                      >
                        {sub.name}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">No subcategories available</p>
                    <Button onClick={goNext} className="rounded-full">
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </StepWrapper>
            )}

            {step === 3 && (
              <StepWrapper
                greeting={stepMessages[3].greeting}
                question={stepMessages[3].question}
                subtitle="Select the company (optional)"
              >
                {loadingEntities ? (
                  <LoadingState />
                ) : (
                  <div className="space-y-3">
                    {entities?.map((ent) => (
                      <motion.button
                        key={ent.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectEntity(ent.id, ent.name)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                          selectedEntity === ent.id
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        {ent.logo_url ? (
                          <img src={ent.logo_url} alt={ent.name} className="w-10 h-10 rounded-lg object-contain" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium text-slate-900">{ent.name}</span>
                        {selectedEntity === ent.id && (
                          <Check className="h-5 w-5 text-primary ml-auto" />
                        )}
                      </motion.button>
                    ))}
                    
                    {/* Skip option */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectEntity(null, "")}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 transition-all"
                    >
                      Skip - I'll mention it in description
                    </motion.button>
                  </div>
                )}
              </StepWrapper>
            )}

            {step === 4 && (
              <StepWrapper
                greeting={stepMessages[4].greeting}
                question={stepMessages[4].question}
                subtitle="Don't hold back - every detail helps"
              >
                <div className="space-y-4">
                  <Textarea
                    ref={textareaRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="I ordered a product on... but then..."
                    className="min-h-[140px] text-base rounded-2xl border-2 border-slate-200 focus:border-primary resize-none"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {description.length < 10 
                        ? `${10 - description.length} more characters needed`
                        : "✓ Looking good!"
                      }
                    </span>
                    <Button
                      onClick={goNext}
                      disabled={description.length < 10}
                      className="rounded-full"
                    >
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </StepWrapper>
            )}

            {step === 5 && (
              <StepWrapper
                greeting={stepMessages[5].greeting}
                question={stepMessages[5].question}
                subtitle="All optional - skip if you want"
              >
                <div className="space-y-5">
                  {/* Transaction ID */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Order/Transaction ID
                    </label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g., ORD-123456"
                      className="rounded-xl border-2 border-slate-200 focus:border-primary"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Amount Involved (₹)
                    </label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g., 5000"
                      className="rounded-xl border-2 border-slate-200 focus:border-primary"
                    />
                  </div>

                  {/* Contact Method */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      How should we contact you?
                    </label>
                    <div className="flex gap-2">
                      {(["email", "phone", "whatsapp"] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => setContactMethod(method)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl font-medium text-sm capitalize transition-all border-2",
                            contactMethod === method
                              ? "border-primary bg-primary text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Supporting Documents
                    </label>
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 transition-colors">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-slate-500">Tap to upload files</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,.pdf"
                      />
                    </label>
                    {documents.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {documents.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                            <span className="truncate text-slate-700">{file.name}</span>
                            <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-6 rounded-xl text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Complaint
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </StepWrapper>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Trust Indicators - Only on first step */}
      {step === 1 && (
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 pb-6"
        >
          <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-500" />
              <span>100% Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Quick Response</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-purple-500" />
              <span>24/7 Support</span>
            </div>
          </div>
        </motion.footer>
      )}
    </div>
  );
}

// Step wrapper component with consistent styling
function StepWrapper({
  greeting,
  question,
  subtitle,
  children,
}: {
  greeting: string;
  question: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Chat bubble style greeting */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-2"
        >
          <Sparkles className="h-4 w-4" />
          {greeting}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-slate-900"
        >
          {question}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 mt-1"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex-1"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Loading state
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <p className="text-slate-500 mt-3">Loading...</p>
    </div>
  );
}
