/**
 * React Query Hooks for ClaimChase API
 * Handles data fetching, caching, and mutations
 * 
 * StaleTime Strategy:
 * - Static data (insurance companies, types): 1 hour
 * - Semi-static data (categories, entities): 30 minutes  
 * - User data (cases, disputes): 5 minutes
 * - Frequently changing (case status, notifications): 1-2 minutes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insuranceAPI, caseAPI } from '@/services';
import { disputeAPI } from '@/services/disputes';
import type { 
  InsuranceCompany, 
  Case, 
  CaseList, 
  CaseCreateData,
  TimelineEvent, 
  EmailTracking, 
  Document,
  DisputeCategory,
  DisputeCategoryBrief,
  Entity,
  ConsumerDispute,
  ConsumerDisputeList,
  ConsumerDisputeCreateData,
  DisputeStats,
} from '@/services/types';

// ==================== Insurance Company Queries ====================

/**
 * Fetch all insurance companies
 */
export const useInsuranceCompanies = (params?: { category?: string; search?: string }) => {
  return useQuery({
    queryKey: ['insurance-companies', params],
    queryFn: () => insuranceAPI.list(params),
    select: (response) => {
      // Handle both paginated and non-paginated responses
      const data = response.data as any;
      return (data.results || data) as InsuranceCompany[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour (rarely changes)
  });
};

/**
 * Fetch single insurance company
 */
export const useInsuranceCompany = (id: number | null) => {
  return useQuery({
    queryKey: ['insurance-company', id],
    queryFn: () => insuranceAPI.get(id!),
    select: (response) => response.data as InsuranceCompany,
    enabled: !!id,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Fetch insurance type choices from backend
 */
export const useInsuranceTypes = () => {
  return useQuery({
    queryKey: ['insurance-types'],
    queryFn: () => insuranceAPI.getInsuranceTypes(),
    select: (response) => response.data.insurance_types as Array<{ value: string; label: string }>,
    staleTime: 60 * 60 * 1000, // 1 hour (rarely changes)
  });
};

// ==================== Case Queries ====================

/**
 * Fetch all cases for logged-in user
 */
export const useCases = (params?: { status?: string; priority?: string }) => {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => caseAPI.list(params),
    select: (response) => {
      // Handle both paginated and non-paginated responses
      const data = response.data as any;
      return (data.results || data) as CaseList[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch single case with full details
 */
export const useCase = (caseId: number | null) => {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: () => caseAPI.get(caseId!),
    select: (response) => response.data as Case,
    enabled: !!caseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Fetch case status summary
 */
export const useCaseStatus = (caseId: number | null) => {
  return useQuery({
    queryKey: ['case-status', caseId],
    queryFn: () => caseAPI.getStatus(caseId!),
    select: (response) => response.data,
    enabled: !!caseId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Fetch ombudsman eligibility status
 */
export const useOmbudsmanStatus = (caseId: number | null) => {
  return useQuery({
    queryKey: ['ombudsman-status', caseId],
    queryFn: () => caseAPI.getOmbudsmanStatus(caseId!),
    select: (response) => response.data,
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch case timeline
 */
export const useCaseTimeline = (caseId: number | null) => {
  return useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: () => caseAPI.getTimeline(caseId!),
    select: (response) => response.data.events as TimelineEvent[],
    enabled: !!caseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Fetch case emails
 */
export const useCaseEmails = (caseId: number | null) => {
  return useQuery({
    queryKey: ['case-emails', caseId],
    queryFn: () => caseAPI.getEmails(caseId!),
    select: (response) => response.data.emails as EmailTracking[],
    enabled: !!caseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Fetch case documents
 */
export const useCaseDocuments = (caseId: number | null) => {
  return useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: () => caseAPI.getDocuments(caseId!),
    select: (response) => response.data.documents as Document[],
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ==================== Case Mutations ====================

/**
 * Create a new case
 */
export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CaseCreateData) => caseAPI.create(data),
    onSuccess: () => {
      // Invalidate cases list to refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
};

/**
 * Update case status
 */
export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { caseId: number; new_status: string; notes?: string }) =>
      caseAPI.updateStatus(data.caseId, {
        new_status: data.new_status,
        notes: data.notes,
      }),
    onSuccess: (response, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-status', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-timeline', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
};

/**
 * Mark case as sent
 */
export const useMarkCaseAsSent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { caseId: number; notes?: string }) =>
      caseAPI.markAsSent(data.caseId, data.notes),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-status', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
};

/**
 * Check for email replies
 */
export const useCheckForReplies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseId: number) => caseAPI.checkForReplies(caseId),
    onSuccess: (response, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-emails', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] });
    },
  });
};

/**
 * Escalate case to ombudsman
 */
export const useEscalateToOmbudsman = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseId: number) => caseAPI.escalateToOmbudsman(caseId),
    onSuccess: (response, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-status', caseId] });
      queryClient.invalidateQueries({ queryKey: ['ombudsman-status', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
};

// ==================== Consumer Dispute Queries ====================

/**
 * Fetch all dispute categories (with subcategories)
 */
export const useDisputeCategories = () => {
  return useQuery({
    queryKey: ['dispute-categories'],
    queryFn: () => disputeAPI.getCategories(),
    select: (response) => response.data as DisputeCategory[],
    staleTime: 60 * 60 * 1000, // 1 hour (admin managed, rarely changes)
  });
};

/**
 * Fetch subcategories for a category
 */
export const useSubcategories = (categoryId: number | null) => {
  return useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => disputeAPI.getSubcategories(categoryId!),
    select: (response) => response.data as DisputeCategoryBrief[],
    enabled: !!categoryId,
    staleTime: 60 * 60 * 1000,
  });
};

/**
 * Fetch entities for a category
 */
export const useEntitiesByCategory = (categoryId: number | null) => {
  return useQuery({
    queryKey: ['entities-by-category', categoryId],
    queryFn: () => disputeAPI.getEntitiesByCategory(categoryId!),
    select: (response) => response.data as Entity[],
    enabled: !!categoryId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Fetch all entities with optional filters
 */
export const useEntities = (params?: { category?: number; search?: string }) => {
  return useQuery({
    queryKey: ['entities', params],
    queryFn: () => disputeAPI.getEntities(params),
    select: (response) => response.data as Entity[],
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * Fetch user's consumer disputes
 */
export const useConsumerDisputes = (params?: { status?: string; category?: number }) => {
  return useQuery({
    queryKey: ['consumer-disputes', params],
    queryFn: () => disputeAPI.list(params),
    select: (response) => {
      const data = response.data as any;
      return (data.results || data) as ConsumerDisputeList[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch single dispute with full details
 */
export const useConsumerDispute = (disputeId: number | null) => {
  return useQuery({
    queryKey: ['consumer-dispute', disputeId],
    queryFn: () => disputeAPI.get(disputeId!),
    select: (response) => response.data as ConsumerDispute,
    enabled: !!disputeId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetch dispute statistics
 */
export const useDisputeStats = () => {
  return useQuery({
    queryKey: ['dispute-stats'],
    queryFn: () => disputeAPI.getStats(),
    select: (response) => response.data as DisputeStats,
    staleTime: 5 * 60 * 1000,
  });
};

// ==================== Consumer Dispute Mutations ====================

/**
 * Create a new consumer dispute
 */
export const useCreateDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsumerDisputeCreateData) => disputeAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumer-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] });
    },
  });
};

/**
 * Upload document to dispute
 */
export const useUploadDisputeDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { disputeId: number; file: File; documentType?: string; description?: string }) =>
      disputeAPI.uploadDocument(data.disputeId, data.file, data.documentType, data.description),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consumer-dispute', variables.disputeId] });
    },
  });
};

// ==================== Medical Review Queries ====================

import { medicalReviewAPI } from '@/services/medicalReview';
import type {
  MedicalReviewerProfile,
  OnboardingData,
  OnboardingCheckResponse,
  ReviewAssignment,
  DocumentReview,
  CreateDocumentReviewData,
  ReviewerDashboardSummary,
  ReviewerStats,
} from '@/services/types';

/**
 * Check if user needs onboarding
 */
export const useCheckOnboarding = () => {
  return useQuery({
    queryKey: ['reviewer-onboarding-check'],
    queryFn: () => medicalReviewAPI.checkOnboarding(),
    select: (response) => response.data as OnboardingCheckResponse,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get current user's medical reviewer profile
 */
export const useReviewerProfile = () => {
  return useQuery({
    queryKey: ['reviewer-profile'],
    queryFn: () => medicalReviewAPI.getMyProfile(),
    select: (response) => response.data as MedicalReviewerProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Complete onboarding
 */
export const useOnboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OnboardingData) => medicalReviewAPI.onboard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewer-onboarding-check'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-profile'] });
    },
  });
};

/**
 * Get dashboard summary
 */
export const useReviewerDashboard = () => {
  return useQuery({
    queryKey: ['reviewer-dashboard'],
    queryFn: () => medicalReviewAPI.getDashboardSummary(),
    select: (response) => response.data as ReviewerDashboardSummary,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
};

/**
 * Get reviewer's assignments
 */
export const useMyAssignments = (status?: string) => {
  return useQuery({
    queryKey: ['my-assignments', status],
    queryFn: () => medicalReviewAPI.getMyAssignments(status),
    select: (response) => response.data as ReviewAssignment[],
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Get assignment details
 */
export const useAssignment = (id: number | null) => {
  return useQuery({
    queryKey: ['assignment', id],
    queryFn: () => medicalReviewAPI.getAssignment(id!),
    select: (response) => response.data as ReviewAssignment,
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Start reviewing an assignment
 */
export const useStartReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => medicalReviewAPI.startReview(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: ['assignment', id] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-dashboard'] });
    },
  });
};

/**
 * Submit a document review
 */
export const useSubmitReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentReviewData) => medicalReviewAPI.submitReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-stats'] });
    },
  });
};

/**
 * Get reviewer stats
 */
export const useReviewerStats = () => {
  return useQuery({
    queryKey: ['reviewer-stats'],
    queryFn: () => medicalReviewAPI.getStats(),
    select: (response) => response.data as ReviewerStats,
    staleTime: 5 * 60 * 1000,
  });
};
