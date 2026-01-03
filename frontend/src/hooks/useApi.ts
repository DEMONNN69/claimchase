/**
 * React Query Hooks for ClaimChase API
 * Handles data fetching, caching, and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insuranceAPI, caseAPI } from '@/services';
import type { 
  InsuranceCompany, 
  Case, 
  CaseList, 
  CaseCreateData,
  TimelineEvent, 
  EmailTracking, 
  Document 
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
