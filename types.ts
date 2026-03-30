export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  TRAFFIC = 'TRAFFIC',
  DESIGN = 'DESIGN',
  CLIENT = 'CLIENT'
}

export enum GrowthPhase {
  START = 'START',
  SCALE = 'SCALE',
  ELITE = 'ELITE'
}

export type MembershipRole = 'owner' | 'pm' | 'social' | 'traffic' | 'design' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId?: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected' | null;
  onboarding_complete: boolean;
}

export interface CompanyRequest {
  id: string;
  company_name: string;
  niche: string | null;
  location: string | null;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

export interface ClientProfile {
  id: string;
  brandName: string;
  phase: GrowthPhase;
  revenue: number;
  revenueTarget: number;
  progress: number; 
  logo?: string;
}

export interface BrandEntity {
  id: string;
  name: string;
  niche: string | null;
  location: string | null;
  phase: GrowthPhase;
  progress: number;
  revenue: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  company_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  spend: number;
  revenue: number;
  platform: 'Instagram' | 'Google' | 'Meta' | 'YouTube' | 'LinkedIn' | 'TikTok';
  start_date: string;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  cpm?: number;
  impressions?: number;
}

export interface Document {
  id: string;
  company_id: string;
  name: string;
  type: string;
  size: string;
  category: string;
  url: string;
  created_at: string;
}

export type MilestoneStatus = "completed" | "in-progress" | "locked";

export interface Milestone {
  id: string;
  clientId: string;
  phase: GrowthPhase;
  title: string;
  description?: string;
  weight: number; 
  status: MilestoneStatus;
  dueDate?: string; 
  ownerRole?: "PM" | "SOCIAL" | "TRAFFIC" | "DESIGN" | "CLIENT" | "LEADERSHIP";
  dependsOn?: string[]; 
}

export interface CRMLead {
  id: string;
  company_id: string;
  name: string;
  company: string;
  value: number;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed' | 'lost';
  created_at: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  channel: string;
}

export interface UpgradeRequest {
  id: string;
  company_id: string;
  requested_by: string;
  current_phase: GrowthPhase;
  requested_phase: GrowthPhase;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  created_at: string;
}

export interface RevenueData {
  month: string;
  revenue: number;
}
