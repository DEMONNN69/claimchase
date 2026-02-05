/**
 * TypeScript Types for API
 */

export interface User {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  insurance_company?: InsuranceCompany;
  problem_type?: string;
  gmail_email?: string;
  gmail_connected?: boolean;
  is_expert?: boolean;
  expert_profile?: ExpertProfile;
}

export interface InsuranceCompany {
  id: number;
  name: string;
  category: 'life' | 'health' | 'general';
  category_display: string;
  grievance_email: string;
  additional_emails: string[];
  grievance_helpline: string;
  gro_email: string;
  website: string;
  correspondence_address: string;
  is_active: boolean;
}

export interface Case {
  id: number;
  case_number: string;
  user: User;
  insurance_company?: InsuranceCompany;
  status: string;
  priority: string;
  insurance_type: string;
  policy_number: string;
  insurance_company_name: string;
  subject: string;
  description: string;
  date_of_incident: string;
  created_at: string;
  updated_at: string;
  ombudsman_status?: OmbudsmanStatus;
}

export interface CaseList {
  id: number;
  case_number: string;
  user_email: string;
  status: string;
  priority: string;
  subject: string;
  insurance_company?: number;
  insurance_company_data?: InsuranceCompany;
  insurance_company_name: string;
  is_escalated_to_ombudsman: boolean;
  ombudsman_status: OmbudsmanStatus;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  description: string;
  old_value?: string;
  new_value?: string;
  created_by_email: string;
  created_at: string;
}

export interface EmailTracking {
  id: number;
  direction: 'sent' | 'received';
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string;
  delivered_at?: string;
}

export interface Document {
  id: number;
  document_type: string;
  file_name: string;
  file_size: number;
  file_size_mb: number;
  mime_type: string;
  is_verified: boolean;
  uploaded_at: string;
}

export interface OmbudsmanStatus {
  is_eligible: boolean;
  days_remaining: number | null;
  reason: string;
}

export interface CaseCreateData {
  insurance_company?: number;
  insurance_company_name?: string;
  policy_number: string;
  insurance_type: string;
  subject: string;
  description: string;
  date_of_incident: string;
}

// Consumer Dispute Types
export interface DisputeCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parent: number | null;
  display_order: number;
  is_active: boolean;
  is_subcategory: boolean;
  level: number;
  subcategories: DisputeCategoryBrief[];
  entity_count: number;
}

export interface DisputeCategoryBrief {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Entity {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  website: string;
  is_active: boolean;
  is_verified: boolean;
}

export interface DisputeDocument {
  id: number;
  dispute: number;
  file: string;
  file_name: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description: string;
  file_url: string;
  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface DisputeTimelineEvent {
  id: number;
  event_type: string;
  description: string;
  performed_by: number;
  performed_by_name: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConsumerDispute {
  id: number;
  dispute_id: string;
  user: number;
  user_data: {
    id: number;
    email: string;
    name: string;
  };
  category: number;
  category_data: DisputeCategoryBrief;
  subcategory: number | null;
  subcategory_data: DisputeCategoryBrief | null;
  entity: number | null;
  entity_data: Entity | null;
  title: string;
  description: string;
  transaction_id: string;
  transaction_date: string | null;
  amount_involved: string | null;
  preferred_contact_method: 'phone' | 'email' | 'whatsapp';
  preferred_contact_time: string;
  status: 'new' | 'contacted' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  internal_notes: string;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  resolved_at: string | null;
  documents: DisputeDocument[];
  timeline: DisputeTimelineEvent[];
}

export interface ConsumerDisputeList {
  id: number;
  dispute_id: string;
  title: string;
  category: number;
  category_name: string;
  subcategory_name: string | null;
  entity_name: string | null;
  status: string;
  priority: string;
  amount_involved: string | null;
  preferred_contact_method: string;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface ConsumerDisputeCreateData {
  category: number;
  subcategory?: number;
  entity?: number;
  title: string;
  description: string;
  transaction_id?: string;
  transaction_date?: string;
  amount_involved?: number;
  preferred_contact_method: 'phone' | 'email' | 'whatsapp';
  preferred_contact_time?: string;
}

export interface DisputeStats {
  total: number;
  new: number;
  in_progress: number;
  contacted: number;
  resolved: number;
  closed: number;
}

// ==================== Medical Review Types ====================

export interface MedicalReviewerProfile {
  id: number;
  user: number;
  user_email: string;
  full_name: string;
  specialization: string;
  other_specialization?: string;
  display_specialization: string;
  years_of_experience: number;
  is_onboarded: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  full_name: string;
  specialization: string;
  other_specialization?: string;
  years_of_experience: number;
}

export interface ReviewAssignment {
  id: number;
  case: number;
  case_number: string;
  case_subject?: string;
  insurance_company: string;
  reviewer: number;
  reviewer_name: string;
  assigned_by: number | null;
  assigned_by_name: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'needs_more_info';
  admin_notes?: string;
  document_count: number;
  reviewed_count: number;
  documents?: AssignmentDocument[];
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AssignmentDocument {
  id: number;
  document: number;
  document_details: DocumentDetails;
  review: DocumentReview | null;
  is_reviewed: boolean;
  added_at: string;
}

export interface DocumentDetails {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description: string;
  file_url: string;
  created_at: string;
}

export interface DocumentReview {
  id: number;
  assignment: number;
  assignment_document: number;
  reviewer: number;
  reviewer_name: string;
  document_name?: string;
  outcome: 'approved' | 'rejected' | 'needs_more_info';
  comments: string;
  additional_info_requested?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentReviewData {
  assignment_document: number;
  outcome: 'approved' | 'rejected' | 'needs_more_info';
  comments: string;
  additional_info_requested?: string;
}

export interface ReviewerDashboardSummary {
  pending_count: number;
  in_progress_count: number;
  completed_count: number;
  needs_info_count: number;
  cases: CaseGroup[];
}

export interface CaseGroup {
  case_id: number;
  case_number: string;
  insurance_company: string;
  assignments: ReviewAssignment[];
}

export interface ReviewerStats {
  reviewer: number;
  reviewer_name: string;
  total_assignments: number;
  pending_assignments: number;
  completed_assignments: number;
  total_documents_reviewed: number;
  approved_count: number;
  rejected_count: number;
  needs_info_count: number;
  avg_review_time_hours: number;
  last_updated: string;
}

export interface OnboardingCheckResponse {
  needs_onboarding: boolean;
  is_reviewer: boolean;
  profile: MedicalReviewerProfile | null;
}

export interface EmailSendResponse {
  success: boolean;
  message: string;
  message_id?: string;
  thread_id?: string;
  case?: Case;
}

export interface EmailSendRequest {
  email_body: string;
  cc_emails?: string[];
}

// Expert Types (similar to Medical Reviewer)
export interface ExpertProfile {
  id: number;
  user: number;
  license_number: string;
  years_of_experience: number;
  bio: string;
  is_active: boolean;
  is_verified: boolean;
  verification_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeAssignment {
  id: number;
  dispute: number;
  dispute_data: ConsumerDispute;
  expert: number;
  expert_data: {
    id: number;
    user: User;
    license_number: string;
    years_of_experience: number;
  };
  status: 'pending' | 'in_review' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_date: string;
  review_started_at: string | null;
  completed_at: string | null;
  expert_comments: string;
  recommendation: string;
  created_at: string;
  updated_at: string;
  documents: DisputeAssignmentDocument[];
}

export interface DisputeAssignmentDocument {
  id: number;
  assignment: number;
  document: number;
  document_data: DisputeDocument;
  is_required: boolean;
  status: 'pending' | 'reviewed';
  created_at: string;
  updated_at: string;
  review: DisputeDocumentReview | null;
}

export interface DisputeDocumentReview {
  id: number;
  assignment_document: number;
  reviewed_by: number;
  outcome: 'approved' | 'rejected' | 'needs_more_info';
  comments: string;
  additional_info_requested: string;
  reviewed_at: string;
}

export interface CreateDisputeAssignmentData {
  dispute: number;
  expert: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  document_ids?: number[];
}

export interface UpdateDisputeAssignmentData {
  status?: 'pending' | 'in_review' | 'completed' | 'rejected';
  expert_comments?: string;
  recommendation?: string;
}

export interface CreateDisputeDocumentReviewData {
  assignment_document: number;
  outcome: 'approved' | 'rejected' | 'needs_more_info';
  comments: string;
  additional_info_requested?: string;
}

export interface ExpertDashboardSummary {
  pending_count: number;
  in_progress_count: number;
  completed_count: number;
  needs_info_count: number;
  disputes: DisputeGroup[];
}

export interface DisputeGroup {
  dispute_id: number;
  dispute_number: string;
  category: string;
  assignments: DisputeAssignment[];
}

export interface ExpertStats {
  expert: number;
  expert_name: string;
  total_assignments: number;
  pending_assignments: number;
  completed_assignments: number;
  total_documents_reviewed: number;
  approved_count: number;
  rejected_count: number;
  needs_info_count: number;
  avg_review_time_hours: number;
  last_updated: string;
}
