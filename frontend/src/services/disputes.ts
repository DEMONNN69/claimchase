/**
 * Consumer Disputes API
 * Handles dispute CRUD operations and category/entity lookups
 */

import apiClient from './client';
import {
  DisputeCategory,
  DisputeCategoryBrief,
  Entity,
  ConsumerDispute,
  ConsumerDisputeList,
  ConsumerDisputeCreateData,
  DisputeStats,
} from './types';

export const disputeAPI = {
  // ==================== Categories ====================
  
  /**
   * Get all categories (with subcategories nested)
   */
  getCategories: () =>
    apiClient.get<DisputeCategory[]>('/dispute-categories/tree/'),

  /**
   * Get top-level categories only
   */
  getTopLevelCategories: () =>
    apiClient.get<DisputeCategory[]>('/dispute-categories/', { params: { parent: 'root' } }),

  /**
   * Get subcategories for a category
   */
  getSubcategories: (categoryId: number) =>
    apiClient.get<DisputeCategoryBrief[]>(`/dispute-categories/${categoryId}/subcategories/`),

  /**
   * Get entities for a category
   */
  getEntitiesByCategory: (categoryId: number) =>
    apiClient.get<Entity[]>(`/dispute-categories/${categoryId}/entities/`),

  // ==================== Entities ====================
  
  /**
   * Get all entities
   */
  getEntities: (params?: { category?: number; search?: string }) =>
    apiClient.get<Entity[]>('/entities/', { params }),

  /**
   * Get single entity
   */
  getEntity: (entityId: number) =>
    apiClient.get<Entity>(`/entities/${entityId}/`),

  // ==================== Disputes ====================
  
  /**
   * Create a new consumer dispute
   */
  create: (data: ConsumerDisputeCreateData) =>
    apiClient.post<ConsumerDispute>('/consumer-disputes/', data),

  /**
   * Get all disputes for logged-in user
   */
  list: (params?: { status?: string; category?: number }) =>
    apiClient.get<ConsumerDisputeList[]>('/consumer-disputes/', { params }),

  /**
   * Get single dispute with full details
   */
  get: (disputeId: number) =>
    apiClient.get<ConsumerDispute>(`/consumer-disputes/${disputeId}/`),

  /**
   * Get current user's disputes
   */
  myDisputes: () =>
    apiClient.get<ConsumerDisputeList[]>('/consumer-disputes/my_disputes/'),

  /**
   * Get dispute statistics
   */
  getStats: () =>
    apiClient.get<DisputeStats>('/consumer-disputes/stats/'),

  /**
   * Upload document to dispute
   */
  uploadDocument: (disputeId: number, file: File, documentType: string = 'other', description: string = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('description', description);
    
    return apiClient.post(`/consumer-disputes/${disputeId}/upload_document/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get documents for a dispute
   */
  getDocuments: (disputeId: number) =>
    apiClient.get(`/consumer-disputes/${disputeId}/documents/`),

  /**
   * Get timeline for a dispute
   */
  getTimeline: (disputeId: number) =>
    apiClient.get(`/consumer-disputes/${disputeId}/timeline/`),
};

export default disputeAPI;
