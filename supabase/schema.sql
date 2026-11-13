-- =====================================================================
--  Գտիր.am — տվյալների բազայի կառուցվածք (Supabase / PostgreSQL)
--  Ինչպես օգտագործել. Supabase → SQL Editor → New query →
--  պատճենիր այս ամբողջ ֆայլը → Run։ Կարելի է գործարկել նաև կրկին։
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Պրոֆիլներ (յուրաքանչյուր գրանցված օգտատիրոջ համար)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        text not null default 'user' check (role in ('user','admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Սովորական օգտատերը չի կարող ինքն իրեն ադմին դարձնել
create or replace function public.protect_profile()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    new.role  := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------------------------------------------------------------------
-- 2. Բիզնեսներ և մասնագետներ (հայտարարություններ)
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users on delete cascade,
  kind           text not null default 'company' check (kind in ('company','specialist')),
  name           text not null check (char_length(name) between 2 and 120),
  category       text not null,
  city           text not null,
  address        text,
  phone          text not null,
  whatsapp       text,
  email          text,
  website        text,
  instagram      text,
  facebook       text,
  description    text check (char_length(description) <= 3000),
  hours          text,
  price_info     text,
  photos         text[] not null default '{}',
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason  text,
  plan           text not null default 'free' check (plan in ('free','pro','premium')),
  plan_rank      int  not null default 0,
  featured_until timestamptz,
  views          int  not null default 0,
  rating_avg     numeric(2,1) not null default 0,
  rating_count   int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists businesses_status_idx   on public.businesses (status);
create index if not exists businesses_city_idx     on public.businesses (city);
create index if not exists businesses_category_idx on public.businesses (category);
create index if not exists businesses_rank_idx     on public.businesses (plan_rank desc, created_at desc);

-- Պաշտպանություն. սովորական օգտատերը չի կարող ինքն իրեն «հաստատել»
-- կամ անվճար Premium դնել։ Խմբագրումից հետո հայտարարությունը կրկին
-- գնում է ստուգման։
create or replace function public.protect_business()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.owner_id       := auth.uid();
      new.status         := 'pending';
      new.reject_reason  := null;
      new.plan           := 'free';
      new.featured_until := null;
      new.views          := 0;
      new.rating_avg     := 0;
      new.rating_count   := 0;
      new.created_at     := now();
    else
      new.owner_id       := old.owner_id;
      new.status         := 'pending';
      new.reject_reason  := null;
      new.plan           := old.plan;
      new.featured_until := old.featured_until;
      new.views          := old.views;
      new.rating_avg     := old.rating_avg;
      new.rating_count   := old.rating_count;
      new.created_at     := old.created_at;
    end if;
  end if;
  new.plan_rank  := case new.plan when 'premium' then 2 when 'pro' then 1 else 0 end;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists protect_business on public.businesses;
create trigger protect_business before insert or update on public.businesses
  for each row execute function public.protect_business();

-- Դիտումների հաշվիչ
create or replace function public.increment_views(bid uuid)
returns void language sql security definer set search_path = public as $$
  update public.businesses set views = views + 1 where id = bid and status = 'approved';
$$;

-- ---------------------------------------------------------------------
-- 3. Կարծիքներ և գնահատականներ
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  author_name  text,
  rating       int  not null check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 1000),
  created_at   timestamptz not null default now(),
  unique (business_id, user_id)
);

create or replace function public.before_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(full_name, ''), 'Օգտատեր') into new.author_name
    from public.profiles where id = auth.uid();
  return new;
end $$;

drop trigger if exists before_review on public.reviews;
create trigger before_review before insert on public.reviews
  for each row execute function public.before_review();

create or replace function public.refresh_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare bid uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses b set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where business_id = bid), 0),
    rating_count = (select count(*) from public.reviews where business_id = bid)
  where b.id = bid;
  return null;
end $$;

drop trigger if exists refresh_rating on public.reviews;
create trigger refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_rating();

-- ---------------------------------------------------------------------
-- 4. Վճարովի փաթեթի հայտեր (Pro / Premium)
-- ---------------------------------------------------------------------
create table if not exists public.plan_requests (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  plan         text not null check (plan in ('pro','premium')),
  months       int  not null default 1 check (months between 1 and 12),
  contact      text,
  status       text not null default 'new' check (status in ('new','done','cancelled')),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Մուտքի իրավունքներ (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.businesses    enable row level security;
alter table public.reviews       enable row level security;
alter table public.plan_requests enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "biz read"   on public.businesses;
drop policy if exists "biz insert" on public.businesses;
drop policy if exists "biz update" on public.businesses;
drop policy if exists "biz delete" on public.businesses;
create policy "biz read"   on public.businesses for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "biz insert" on public.businesses for insert with check (auth.uid() is not null);
create policy "biz update" on public.businesses for update using (owner_id = auth.uid() or public.is_admin());
create policy "biz delete" on public.businesses for delete using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "reviews read"   on public.reviews;
drop policy if exists "reviews insert" on public.reviews;
drop policy if exists "reviews delete" on public.reviews;
create policy "reviews read"   on public.reviews for select using (true);
create policy "reviews insert" on public.reviews for insert with check (
  auth.uid() is not null
  and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved' and b.owner_id <> auth.uid())
);
create policy "reviews delete" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "requests read"   on public.plan_requests;
drop policy if exists "requests insert" on public.plan_requests;
drop policy if exists "requests update" on public.plan_requests;
create policy "requests read"   on public.plan_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "requests insert" on public.plan_requests for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);
create policy "requests update" on public.plan_requests for update using (public.is_admin());

-- Մուտքի թույլտվություններ API-ի համար (RLS-ը վերևում սահմանափակում է՝ ով ինչ տեսնի)
grant usage on schema public to anon, authenticated;
grant select on public.businesses, public.reviews to anon;
grant select, insert, update, delete on public.businesses, public.reviews, public.plan_requests, public.profiles to authenticated;

grant execute on function public.increment_views(uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Լուսանկարների պահոց (Storage)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos upload" on storage.objects;
drop policy if exists "photos delete" on storage.objects;
create policy "photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =====================================================================
--  ՎԵՐՋ։ Ինքդ քեզ ադմին դարձնելու համար (կայքում գրանցվելուց հետո).
--    update public.profiles set role = 'admin' where email = 'քո@email.com';
-- =====================================================================
