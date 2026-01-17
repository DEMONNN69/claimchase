/**
 * Medical Review API
 * Handles reviewer profiles, assignments, and document reviews
 */

import apiClient from './client';
import {
  MedicalReviewerProfile,
  OnboardingData,
  OnboardingCheckResponse,
  ReviewAssignment,
  DocumentReview,
  CreateDocumentReviewData,
  ReviewerDashboardSummary,
  ReviewerStats,
} from './types';

export const medicalReviewAPI = {
  // ==================== Profile & Onboarding ====================

  /**
   * Check if current user needs onboarding
   */
  checkOnboarding: () =>
    apiClient.get<OnboardingCheckResponse>('/medical-review/profiles/check_onboarding/'),

  /**
   * Get current user's profile
   */
  getMyProfile: () =>
    apiClient.get<MedicalReviewerProfile>('/medical-review/profiles/me/'),

  /**
   * Complete onboarding
   */
  onboard: (data: OnboardingData) =>
    apiClient.post<MedicalReviewerProfile>('/medical-review/profiles/onboard/', data),

  /**
   * Update profile
   */
  updateProfile: (data: Partial<OnboardingData>) =>
    apiClient.patch<MedicalReviewerProfile>('/medical-review/profiles/me/', data),

  // ==================== Assignments ====================

  /**
   * Get reviewer's assignments
   */
  getMyAssignments: (status?: string) =>
    apiClient.get<ReviewAssignment[]>('/medical-review/assignments/my_assignments/', {
      params: status ? { status } : undefined,
    }),

  /**
   * Get assignment details
   */
  getAssignment: (id: number) =>
    apiClient.get<ReviewAssignment>(`/medical-review/assignments/${id}/`),

  /**
   * Start reviewing an assignment
   */
  startReview: (id: number) =>
    apiClient.post<ReviewAssignment>(`/medical-review/assignments/${id}/start_review/`),

  /**
   * Get dashboard summary
   */
  getDashboardSummary: () =>
    apiClient.get<ReviewerDashboardSummary>('/medical-review/assignments/dashboard_summary/'),

  /**
   * Get reviewer stats
   */
  getStats: () =>
    apiClient.get<ReviewerStats>('/medical-review/assignments/stats/'),

  // ==================== Document Reviews ====================

  /**
   * Submit a document review
   */
  submitReview: (data: CreateDocumentReviewData) =>
    apiClient.post<DocumentReview>('/medical-review/reviews/submit_review/', data),

  /**
   * Get all reviews by current user
   */
  getMyReviews: () =>
    apiClient.get<DocumentReview[]>('/medical-review/reviews/'),

  /**
   * Update a review
   */
  updateReview: (id: number, data: Partial<CreateDocumentReviewData>) =>
    apiClient.patch<DocumentReview>(`/medical-review/reviews/${id}/`, data),
};
