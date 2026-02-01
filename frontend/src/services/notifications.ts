/**
 * Notifications API Service
 * Handles in-app notification operations
 */

import { apiClient } from './client';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string;
  created_at: string;
  case_id: number | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
  has_next: boolean;
}

/**
 * Fetch user notifications
 */
export const getNotifications = async (
  unreadOnly = false,
  limit = 10,
  page = 1
): Promise<NotificationsResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
  });

  if (unreadOnly) {
    params.append('unread_only', 'true');
  }

  const response = await apiClient.get<NotificationsResponse>(
    `/notifications/?${params.toString()}`
  );
  return response.data;
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (
  notificationId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post(
    `/notifications/${notificationId}/read/`
  );
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<{
  success: boolean;
  message: string;
  updated_count: number;
}> => {
  const response = await apiClient.post('/notifications/mark-all-read/');
  return response.data;
};
