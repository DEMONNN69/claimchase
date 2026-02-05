/**
 * Expert API Service
 * Handles expert-related API calls for dispute review
 */

import apiClient from './client';
import {
  ExpertProfile,
  DisputeAssignment,
  CreateDisputeAssignmentData,
  UpdateDisputeAssignmentData,
  DisputeDocumentReview,
  CreateDisputeDocumentReviewData,
  ExpertDashboardSummary,
  ExpertStats,
} from './types';

export const expertAPI = {
  /**
   * Check if current user needs onboarding
   */
  checkOnboarding: () =>
    apiClient.get<{ needs_onboarding: boolean }>('/experts/check_onboarding/'),

  /**
   * Get expert profile
   */
  getProfile: () =>
    apiClient.get<ExpertProfile>('/experts/me/'),

  /**
   * Update expert profile
   */
  updateProfile: (data: Partial<ExpertProfile>) =>
    apiClient.patch<ExpertProfile>('/experts/me/', data),

  /**
   * Get expert dashboard summary
   */
  getDashboard: () =>
    apiClient.get<ExpertDashboardSummary>('/expert-assignments/dashboard/'),

  /**
   * Get expert statistics
   */
  getStats: () =>
    apiClient.get<ExpertStats>('/expert-assignments/stats/'),

  /**
   * Get all assignments for the expert
   */
  getAssignments: (params?: { status?: string; priority?: string }) =>
    apiClient.get<DisputeAssignment[]>('/expert-assignments/', { params }),

  /**
   * Get a specific assignment
   */
  getAssignment: (assignmentId: number) =>
    apiClient.get<DisputeAssignment>(`/expert-assignments/${assignmentId}/`),

  /**
   * Start reviewing an assignment (change status to in_review)
   */
  startReview: (assignmentId: number) =>
    apiClient.post(`/expert-assignments/${assignmentId}/start_review/`),

  /**
   * Complete an assignment
   */
  completeReview: (assignmentId: number, data: UpdateDisputeAssignmentData) =>
    apiClient.post(`/expert-assignments/${assignmentId}/complete_review/`, data),

  /**
   * Update assignment
   */
  updateAssignment: (assignmentId: number, data: UpdateDisputeAssignmentData) =>
    apiClient.patch<DisputeAssignment>(`/expert-assignments/${assignmentId}/`, data),

  /**
   * Create a document review
   */
  createDocumentReview: (data: CreateDisputeDocumentReviewData) =>
    apiClient.post<DisputeDocumentReview>('/expert-document-reviews/', data),

  /**
   * Update a document review
   */
  updateDocumentReview: (reviewId: number, data: Partial<CreateDisputeDocumentReviewData>) =>
    apiClient.patch<DisputeDocumentReview>(`/expert-document-reviews/${reviewId}/`, data),

  /**
   * Get document reviews for an assignment
   */
  getDocumentReviews: (assignmentId: number) =>
    apiClient.get<DisputeDocumentReview[]>(`/expert-assignments/${assignmentId}/document-reviews/`),
};

export default expertAPI;
