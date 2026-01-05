/**
 * Gmail API Service
 * Handles Gmail OAuth connection and email operations
 */

import apiClient from './client';

export const gmailAPI = {
  /**
   * Get Gmail OAuth authorization URL
   * User should visit this URL to authorize
   */
  getAuthorizationUrl: () =>
    apiClient.get('/auth/gmail/connect/'),

  /**
   * Exchange authorization code for tokens
   * Called after user authorizes on Google's page
   */
  handleCallback: (code: string) =>
    apiClient.post('/auth/gmail/callback/', { code }),

  /**
   * Disconnect Gmail account
   */
  disconnect: () =>
    apiClient.post('/auth/gmail/disconnect/'),

  /**
   * Send email via Gmail API
   */
  sendEmail: (caseId: number, emailBody: string, ccEmails: string[] = []) =>
    apiClient.post(`/cases/${caseId}/send_email/`, {
      email_body: emailBody,
      cc_emails: ccEmails,
    }),
};
