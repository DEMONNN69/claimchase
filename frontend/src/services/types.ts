/**
 * TypeScript Types for API
 */

export interface User {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  insurance_company?: InsuranceCompany;
  problem_type?: string;
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
