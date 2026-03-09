
-- WowSociety Supabase Schema - Single Source of Truth

-- 1) Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'CLIENT' check (role in ('CLIENT', 'TEAM', 'ADMIN')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Companies Table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase text not null default 'START' check (phase in ('START', 'SCALE', 'ELITE')),
  revenue numeric not null default 0,
  progress numeric not null default 0,
  niche text,
  location text,
  goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Memberships Table (Links Users to Companies)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'client' check (role in ('owner', 'pm', 'social', 'traffic', 'design', 'client')),
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);

-- 4) Milestones Table
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  phase text not null check (phase in ('START', 'SCALE', 'ELITE')),
  title text not null,
  description text,
  weight integer not null default 1,
  status text not null default 'locked' check (status in ('completed', 'in-progress', 'locked')),
  due_date timestamptz,
  owner_role text,
  depends_on uuid[] default '{}',
  created_at timestamptz not null default now()
);

-- 5) Company Messages Table
create table if not exists public.company_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 6) Company Documents Table
create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null,
  size text,
  category text,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 7) Upgrade Requests Table
create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  from_phase text not null,
  to_phase text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id)
);

-- 8) CRM Leads Table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  company_name text,
  value numeric not null default 0,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'proposal', 'closed', 'lost')),
  created_at timestamptz not null default now()
);

-- 9) Revenue History Table
create table if not exists public.revenue_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  month text not null,
  revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id, month)
);

-- 10) Company Metrics Table
create table if not exists public.company_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  recorded_at timestamptz not null default now()
);

-- 11) Helper Functions
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'ADMIN'
  );
end;
$$ language plpgsql security definer;

-- 9) RLS Policies

-- Profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- Companies
alter table public.companies enable row level security;
create policy "Users can view assigned companies" on public.companies for select using (
  exists (select 1 from public.memberships where company_id = companies.id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Admins can manage companies" on public.companies for all using (public.is_admin());

-- Memberships
alter table public.memberships enable row level security;
create policy "Users can view own memberships" on public.memberships for select using (user_id = auth.uid() or public.is_admin());
create policy "Admins can manage memberships" on public.memberships for all using (public.is_admin());

-- Milestones
alter table public.milestones enable row level security;
create policy "Users can view company milestones" on public.milestones for select using (
  exists (select 1 from public.memberships where company_id = milestones.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Users can update company milestones" on public.milestones for update using (
  exists (select 1 from public.memberships where company_id = milestones.company_id and user_id = auth.uid())
  or public.is_admin()
);

-- Messages
alter table public.company_messages enable row level security;
create policy "Users can view company messages" on public.company_messages for select using (
  exists (select 1 from public.memberships where company_id = company_messages.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Users can insert company messages" on public.company_messages for insert with check (
  exists (select 1 from public.memberships where company_id = company_messages.company_id and user_id = auth.uid())
  or public.is_admin()
);

-- Documents
alter table public.company_documents enable row level security;
create policy "Users can view company documents" on public.company_documents for select using (
  exists (select 1 from public.memberships where company_id = company_documents.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Admins can manage documents" on public.company_documents for all using (public.is_admin());
create policy "Admins can delete documents" on public.company_documents for delete using (public.is_admin());

-- Upgrade Requests
alter table public.upgrade_requests enable row level security;
create policy "Users can view own company upgrade requests" on public.upgrade_requests for select using (
  exists (select 1 from public.memberships where company_id = upgrade_requests.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Users can insert upgrade requests" on public.upgrade_requests for insert with check (
  exists (select 1 from public.memberships where company_id = upgrade_requests.company_id and user_id = auth.uid())
);
create policy "Admins can manage upgrade requests" on public.upgrade_requests for all using (public.is_admin());

-- Leads
alter table public.leads enable row level security;
create policy "Users can view company leads" on public.leads for select using (
  exists (select 1 from public.memberships where company_id = leads.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Users can manage company leads" on public.leads for all using (
  exists (select 1 from public.memberships where company_id = leads.company_id and user_id = auth.uid())
  or public.is_admin()
);

-- Revenue History
alter table public.revenue_history enable row level security;
create policy "Users can view company revenue" on public.revenue_history for select using (
  exists (select 1 from public.memberships where company_id = revenue_history.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Admins can manage revenue history" on public.revenue_history for all using (public.is_admin());

-- Company Metrics
alter table public.company_metrics enable row level security;
create policy "Users can view company metrics" on public.company_metrics for select using (
  exists (select 1 from public.memberships where company_id = company_metrics.company_id and user_id = auth.uid())
  or public.is_admin()
);
create policy "Admins can manage metrics" on public.company_metrics for all using (public.is_admin());

-- 11) RPC Functions for Evolution
create or replace function public.request_upgrade(p_company_id uuid, p_note text)
returns void as $$
declare
  v_current_phase text;
  v_next_phase text;
begin
  select phase into v_current_phase from public.companies where id = p_company_id;
  
  if v_current_phase = 'START' then v_next_phase := 'SCALE';
  elsif v_current_phase = 'SCALE' then v_next_phase := 'ELITE';
  else raise exception 'Company is already at maximum phase';
  end if;

  insert into public.upgrade_requests (company_id, from_phase, to_phase, note)
  values (p_company_id, v_current_phase, v_next_phase, p_note);
end;
$$ language plpgsql security definer;

create or replace function public.approve_upgrade(p_request_id uuid)
returns void as $$
declare
  v_company_id uuid;
  v_to_phase text;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  select company_id, to_phase into v_company_id, v_to_phase 
  from public.upgrade_requests where id = p_request_id;

  update public.companies set phase = v_to_phase where id = v_company_id;
  update public.upgrade_requests set status = 'approved', decided_at = now(), decided_by = auth.uid() where id = p_request_id;
end;
$$ language plpgsql security definer;

create or replace function public.deny_upgrade(p_request_id uuid, p_note text)
returns void as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  update public.upgrade_requests 
  set status = 'denied', note = p_note, decided_at = now(), decided_by = auth.uid() 
  where id = p_request_id;
end;
$$ language plpgsql security definer;
