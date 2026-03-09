export enum UserRole {
  CLIENT = 'CLIENT',
  TEAM = 'TEAM',
  ADMIN = 'ADMIN'
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
  onboarding_complete: boolean;
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
  goals: string | null;
  phase: GrowthPhase;
  progress: number;
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
  name: string;
  company: string;
  value: number;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed' | 'lost';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  channel: string;
}