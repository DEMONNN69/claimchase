/**
 * Ombudsman Guide Page
 * Step-by-step visual guide for navigating the ombudsman process
 * 15 steps with images, progress tracking, and navigation
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { caseAPI } from '@/services/cases';

interface GuideProgress {
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  completed_at: string | null;
  total_steps: number;
}

const STEP_DESCRIPTIONS = [
  {
    title: 'Understanding Your Rights',
    description: 'Learn about your rights as an insurance policyholder and when you can approach the Insurance Ombudsman.',
  },
  {
    title: 'Eligibility Check',
    description: 'Verify if your complaint is eligible for the Ombudsman scheme and falls within their jurisdiction.',
  },
  {
    title: 'Required Documents',
    description: 'Gather all necessary documents including policy details, complaint history, and correspondence with the insurer.',
  },
  {
    title: 'Complaint Format',
    description: 'Understand the proper format and structure for submitting your complaint to the Ombudsman.',
  },
  {
    title: 'Personal Information',
    description: 'Fill in your personal details including name, address, contact information, and policy number.',
  },
  {
    title: 'Policy Details',
    description: 'Provide complete information about your insurance policy, including type, number, and coverage details.',
  },
  {
    title: 'Grievance Details',
    description: 'Describe your grievance in detail, including what happened and how the insurer failed to address it.',
  },
  {
    title: 'Timeline of Events',
    description: 'Document the chronological sequence of events from the incident to filing with the Ombudsman.',
  },
  {
    title: 'Relief Sought',
    description: 'Clearly state what resolution or compensation you are seeking from the Ombudsman.',
  },
  {
    title: 'Supporting Documents',
    description: 'Attach all relevant supporting documents, including claim forms, rejection letters, and correspondence.',
  },
  {
    title: 'Declaration and Signature',
    description: 'Review the declaration carefully and provide your signature to authenticate the complaint.',
  },
  {
    title: 'Submission Methods',
    description: 'Learn about the different ways to submit your complaint - online, by post, or in person.',
  },
  {
    title: 'Acknowledgment Process',
    description: 'Understand how you will receive acknowledgment of your complaint and what to expect next.',
  },
  {
    title: 'Follow-up Procedures',
    description: 'Know how to track your complaint status and when to follow up with the Ombudsman office.',
  },
  {
    title: 'Decision Timeline',
    description: 'Understand the expected timeline for the Ombudsman\'s decision and the award implementation process.',
  },
];

export default function OmbudsmanGuide() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (caseId) {
      fetchProgress();
    }
  }, [caseId]);

  useEffect(() => {
    // Auto-save progress when step changes (with debounce)
    const timer = setTimeout(() => {
      if (!isLoading && caseId) {
        saveProgress();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentStep, completedSteps, isCompleted]);

  const fetchProgress = async () => {
    try {
      const response = await caseAPI.getOmbudsmanGuideProgress(parseInt(caseId!));
      if (response.data.success) {
        const data = response.data.data as GuideProgress;
        setCurrentStep(data.current_step);
        setCompletedSteps(data.completed_steps);
        setIsCompleted(data.is_completed);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      toast.error('Failed to load your progress');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!caseId || isSaving) return;

    setIsSaving(true);
    try {
      await caseAPI.updateOmbudsmanGuideProgress(
        parseInt(caseId),
        currentStep,
        completedSteps,
        isCompleted
      );
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 15) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMarkCompleted = async () => {
    // Mark all steps as completed
    const allSteps = Array.from({ length: 15 }, (_, i) => i + 1);
    setCompletedSteps(allSteps);
    setIsCompleted(true);
    
    try {
      await caseAPI.updateOmbudsmanGuideProgress(
        parseInt(caseId!),
        15,
        allSteps,
        true
      );
      toast.success('Guide marked as completed!');
    } catch (error) {
      console.error('Failed to mark as completed:', error);
      toast.error('Failed to save completion status');
    }
  };

  const progressPercentage = (completedSteps.length / 15) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/cases/${caseId}`)}
            className="mb-4"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Case
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ombudsman Form Guide
          </h1>
          <p className="text-gray-600">
            Follow these steps to properly file your complaint with the Insurance Ombudsman
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Step {currentStep} of 15
                </p>
                <p className="text-xs text-gray-500">
                  {completedSteps.length} steps viewed
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCompleted && (
                  <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </span>
                )}
                {isSaving && (
                  <span className="text-xs text-gray-500">Saving...</span>
                )}
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </Card>

        {/* Step Content */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {STEP_DESCRIPTIONS[currentStep - 1].title}
              </h2>
              <p className="text-gray-600">
                {STEP_DESCRIPTIONS[currentStep - 1].description}
              </p>
            </div>

            {/* Image */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <img
                src={`/images/ombudsman_process/${currentStep}.png`}
                alt={`Step ${currentStep}: ${STEP_DESCRIPTIONS[currentStep - 1].title}`}
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {currentStep === 15 && !isCompleted && (
              <Button
                variant="default"
                onClick={handleMarkCompleted}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark as Completed
              </Button>
            )}
          </div>

          <Button
            variant="default"
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Indicators */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {Array.from({ length: 15 }, (_, i) => i + 1).map((step) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                step === currentStep
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : completedSteps.includes(step)
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {step}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
