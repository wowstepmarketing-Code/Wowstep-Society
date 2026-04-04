
-- IMPORTANT: After modifying this file, you MUST run the following SQL directly in the Supabase SQL Editor 
-- to ensure the handle_new_user trigger is updated correctly for new signups.
--
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, email, full_name, role, status)
--   VALUES (new.id, new.email, '', 'CLIENT', 'approved');
--   RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1) Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'CLIENT',
  status text, -- NULL, 'pending', 'approved', 'rejected'
  onboarding_complete boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2) Companies Table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase text not null default 'START',
  revenue numeric not null default 0,
  ltv numeric not null default 0,
  health_score integer not null default 100,
  progress numeric not null default 0,
  status text not null default 'Growth',
  niche text,
  location text,
  owner_id uuid references public.profiles(id),
  last_client_reply_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3) Memberships Table
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'MEMBER',
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);

-- 4) Milestones Table
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  phase text not null,
  title text not null,
  description text,
  weight numeric not null default 1,
  status text not null default 'locked',
  due_date date,
  owner_role text,
  created_at timestamptz not null default now()
);

-- 5) Helper Functions
create or replace function public.is_admin()
returns boolean as $$
begin
  return (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'ADMIN'
    )
    or (auth.jwt() ->> 'email' = 'wowstepmarketing@gmail.com' and auth.jwt() ->> 'email_confirmed_at' is not null)
  );
end;
$$ language plpgsql security definer;

-- 6) RLS for Profiles
alter table public.profiles enable row level security;

create policy "profiles_view_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- 7) RLS for Companies
alter table public.companies enable row level security;

create policy "companies_view_member" on public.companies
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = companies.id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "companies_manage_admin" on public.companies
  for all using (public.is_admin());

-- 8) RLS for Memberships
alter table public.memberships enable row level security;

create policy "memberships_view_member" on public.memberships
  for select using (
    user_id = auth.uid() or public.is_admin()
  );

create policy "memberships_manage_admin" on public.memberships
  for all using (public.is_admin());

-- 9) RLS for Milestones
alter table public.milestones enable row level security;

create policy "milestones_view_member" on public.milestones
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = milestones.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "milestones_manage_admin" on public.milestones
  for all using (public.is_admin());

-- 15) Company Messages Table (Internal Team/Client Chat)
create table if not exists public.company_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 16) RLS for Company Messages
alter table public.company_messages enable row level security;

create policy "users_view_own_company_messages" on public.company_messages
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = company_messages.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "users_insert_own_company_messages" on public.company_messages
  for insert with check (
    exists (
      select 1 from public.memberships m 
      where m.company_id = company_messages.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

-- 17) Leads Table (CRM)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  company text not null,
  value numeric not null default 0,
  stage text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "users_view_own_company_leads" on public.leads
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = leads.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "users_manage_own_company_leads" on public.leads
  for all using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = leads.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

-- 18) Documents Table (Document Hub)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null,
  size text not null,
  category text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "users_view_own_company_documents" on public.documents
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = documents.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "users_manage_own_company_documents" on public.documents
  for all using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = documents.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

-- 19) Campaigns Table (Analytics)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  spend numeric not null default 0,
  revenue numeric not null default 0,
  platform text not null,
  start_date date not null default current_date,
  ctr numeric,
  cpc numeric,
  conversion_rate numeric,
  impressions integer,
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "users_view_own_company_campaigns" on public.campaigns
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = campaigns.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

-- 20) Indexes for performance
create index if not exists idx_company_messages_company_id on public.company_messages(company_id);
create index if not exists idx_leads_company_id on public.leads(company_id);
create index if not exists idx_documents_company_id on public.documents(company_id);
create index if not exists idx_campaigns_company_id on public.campaigns(company_id);

-- 21) Upgrade Requests Table
create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  current_phase text,
  requested_phase text,
  status text default 'pending',
  reason text,
  created_at timestamptz default now()
);

alter table public.upgrade_requests enable row level security;

create policy "users_view_own_upgrade_requests" on public.upgrade_requests
  for select using (
    requested_by = auth.uid() or public.is_admin()
  );

create policy "users_insert_own_upgrade_requests" on public.upgrade_requests
  for insert with check (
    requested_by = auth.uid()
  );

create policy "admins_manage_upgrade_requests" on public.upgrade_requests
  for all using (public.is_admin());

-- 22) Revenue History Table
create table if not exists public.revenue_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  month text not null,
  revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id, month)
);

alter table public.revenue_history enable row level security;

create policy "users_view_own_company_revenue" on public.revenue_history
  for select using (
    exists (
      select 1 from public.memberships m 
      where m.company_id = revenue_history.company_id 
      and m.user_id = auth.uid()
    ) or public.is_admin()
  );

-- 23) RPCs for Upgrade Requests
create or replace function public.request_upgrade(
  p_company_id uuid,
  p_requested_phase text,
  p_reason text default null
)
returns uuid as $$
declare
  v_request_id uuid;
  v_current_phase text;
begin
  select phase into v_current_phase from public.companies where id = p_company_id;
  
  insert into public.upgrade_requests (company_id, requested_by, current_phase, requested_phase, reason)
  values (p_company_id, auth.uid(), v_current_phase, p_requested_phase, p_reason)
  returning id into v_request_id;
  
  return v_request_id;
end;
$$ language plpgsql security definer;

create or replace function public.approve_upgrade(p_request_id uuid)
returns void as $$
declare
  v_company_id uuid;
  v_requested_phase text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select company_id, requested_phase into v_company_id, v_requested_phase
  from public.upgrade_requests where id = p_request_id;

  update public.companies set phase = v_requested_phase where id = v_company_id;
  update public.upgrade_requests set status = 'approved' where id = p_request_id;
end;
$$ language plpgsql security definer;

create or replace function public.deny_upgrade(p_request_id uuid, p_reason text default null)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  update public.upgrade_requests 
  set status = 'denied', reason = coalesce(p_reason, reason)
  where id = p_request_id;
end;
$$ language plpgsql security definer;

-- 25) Company Requests Table
create table if not exists public.company_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  niche text,
  location text,
  requested_by uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now()
);

alter table public.company_requests enable row level security;

create policy "users_view_own_company_requests" on public.company_requests
  for select using (
    requested_by = auth.uid() or public.is_admin()
  );

create policy "users_insert_own_company_requests" on public.company_requests
  for insert with check (
    requested_by = auth.uid()
  );

create policy "admins_manage_company_requests" on public.company_requests
  for all using (public.is_admin());

-- 24) Automatic Profile Creation Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (new.id, new.email, '', 'CLIENT', 'approved');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
