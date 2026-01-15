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
  gmail_email?: string;
  gmail_connected?: boolean;
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
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  resolved_at: string | null;
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
