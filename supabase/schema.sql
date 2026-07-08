-- ============================================================
-- TMB SUMMER BOOK — Schéma Supabase (v2 — plateforme multi-rôles)
-- Tables préfixées "tmb_" : instance Supabase partagée entre plusieurs
-- projets, on reste isolé du reste sans schéma dédié (PostgREST
-- n'expose que "public" par défaut).
--
-- Remplace l'ancien système de compte "maison" (tmb_players +
-- tmb_login_or_signup / tmb_save_state) par une authentification
-- Supabase Auth standard (email + mot de passe), avec 3 rôles :
-- admin, coach, player.
--
-- Idempotent : peut être rejoué sans erreur sur une base déjà migrée.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. CATEGORIES
-- ------------------------------------------------------------
create table if not exists public.tmb_categories (
  id serial primary key,
  name text unique not null,
  min_age int not null,
  max_age int not null,
  check (min_age <= max_age)
);

-- ------------------------------------------------------------
-- 2. PROFILES — 1 ligne par utilisateur Supabase Auth
-- ------------------------------------------------------------
create table if not exists public.tmb_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  birth_date date,
  role text not null default 'player' check (role in ('admin', 'coach', 'player')),
  assigned_category_id int references public.tmb_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tmb_profiles_role_idx on public.tmb_profiles (role);
create index if not exists tmb_profiles_category_idx on public.tmb_profiles (assigned_category_id);

-- ------------------------------------------------------------
-- 3. TRAINING PLANS — un plan = une catégorie + une semaine (1 à 5)
-- ------------------------------------------------------------
create table if not exists public.tmb_training_plans (
  id uuid primary key default gen_random_uuid(),
  category_id int not null references public.tmb_categories(id) on delete cascade,
  week_number int not null check (week_number between 1 and 5),
  objective text,
  warmup text,
  rpe text,
  updated_at timestamptz not null default now(),
  unique (category_id, week_number)
);

-- ------------------------------------------------------------
-- 4. EXERCISES — exercices d'un plan
-- ------------------------------------------------------------
create table if not exists public.tmb_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.tmb_training_plans(id) on delete cascade,
  name text not null,
  sets int,
  duration int,        -- en secondes
  intensity int check (intensity between 1 and 10),
  reps text,            -- consigne brute (ex. "3 X 10", "2 X 30 sec") — complète sets/duration
                          -- quand la prescription originale n'est pas réductible à un seul nombre
  position int not null default 0,
  video_url text
);
create index if not exists tmb_exercises_plan_idx on public.tmb_exercises (plan_id);

-- ------------------------------------------------------------
-- 5. PLAYER VALIDATIONS — 1 ligne par (joueur, exercice)
-- ------------------------------------------------------------
create table if not exists public.tmb_player_validations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.tmb_profiles(id) on delete cascade,
  exercise_id uuid not null references public.tmb_exercises(id) on delete cascade,
  validated boolean not null default false,
  validation_date timestamptz,
  unique (player_id, exercise_id)
);
create index if not exists tmb_validations_player_idx on public.tmb_player_validations (player_id);

-- ============================================================
-- FONCTIONS UTILITAIRES (rôle courant, catégorie courante)
-- SECURITY DEFINER + requêtes simples par clé primaire : évite la
-- récursion RLS quand ces fonctions sont utilisées dans les policies
-- de tmb_profiles elle-même (pattern standard Supabase).
-- ============================================================
create or replace function public.tmb_current_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.tmb_profiles where id = auth.uid();
$$;

create or replace function public.tmb_current_category()
returns int
language sql stable security definer set search_path = public as $$
  select assigned_category_id from public.tmb_profiles where id = auth.uid();
$$;

create or replace function public.tmb_is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.tmb_current_role() = 'admin';
$$;

create or replace function public.tmb_is_coach()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.tmb_current_role() = 'coach';
$$;

-- Catégorie correspondant à un âge donné (première correspondance).
create or replace function public.tmb_category_for_age(p_age int)
returns int
language sql stable as $$
  select id from public.tmb_categories
  where p_age between min_age and max_age
  order by min_age
  limit 1;
$$;

-- ============================================================
-- CRÉATION AUTOMATIQUE DU PROFIL AU SIGNUP
-- Lit first_name / last_name / birth_date depuis les métadonnées
-- passées à supabase.auth.signUp({ options: { data: {...} } }).
-- Rôle toujours "player" à la création ; l'admin promeut ensuite.
-- ============================================================
create or replace function public.tmb_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_birth date;
  v_age int;
  v_cat_id int;
  v_role text := 'player';
begin
  begin
    v_birth := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    v_birth := null;
  end;

  if v_birth is not null then
    v_age := extract(year from age(current_date, v_birth));
    v_cat_id := public.tmb_category_for_age(v_age);
  end if;

  -- Bootstrap : le tout premier compte créé sur l'instance devient admin
  -- automatiquement (aucun autre moyen de créer le 1er admin sans clé
  -- service_role, qui n'est jamais exposée côté client).
  if not exists (select 1 from public.tmb_profiles) then
    v_role := 'admin';
  end if;

  insert into public.tmb_profiles (id, email, first_name, last_name, birth_date, role, assigned_category_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    v_birth,
    v_role,
    v_cat_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists tmb_on_auth_user_created on auth.users;
create trigger tmb_on_auth_user_created
  after insert on auth.users
  for each row execute function public.tmb_handle_new_user();

-- ============================================================
-- GARDE-FOU : seul un admin peut changer role / assigned_category_id
-- (empêche un joueur de se promouvoir lui-même via une requête directe).
-- ============================================================
create or replace function public.tmb_guard_profile_update()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.tmb_is_admin() then
    new.role := old.role;
    new.assigned_category_id := old.assigned_category_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tmb_before_profile_update on public.tmb_profiles;
create trigger tmb_before_profile_update
  before update on public.tmb_profiles
  for each row execute function public.tmb_guard_profile_update();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.tmb_categories enable row level security;
alter table public.tmb_profiles enable row level security;
alter table public.tmb_training_plans enable row level security;
alter table public.tmb_exercises enable row level security;
alter table public.tmb_player_validations enable row level security;

-- ---------- tmb_categories : lecture publique authentifiée, écriture admin ----------
drop policy if exists tmb_categories_select on public.tmb_categories;
create policy tmb_categories_select on public.tmb_categories
  for select to authenticated using (true);

drop policy if exists tmb_categories_write on public.tmb_categories;
create policy tmb_categories_write on public.tmb_categories
  for all to authenticated
  using (public.tmb_is_admin())
  with check (public.tmb_is_admin());

-- ---------- tmb_profiles ----------
drop policy if exists tmb_profiles_select on public.tmb_profiles;
create policy tmb_profiles_select on public.tmb_profiles
  for select to authenticated using (
    id = auth.uid()
    or public.tmb_is_admin()
    or (public.tmb_is_coach() and assigned_category_id = public.tmb_current_category())
  );

-- Un utilisateur peut mettre à jour sa propre ligne (prénom, nom, date de
-- naissance...) ; role/assigned_category_id sont verrouillés par le
-- trigger tmb_guard_profile_update pour les non-admins. L'admin peut
-- modifier n'importe quel profil.
drop policy if exists tmb_profiles_update on public.tmb_profiles;
create policy tmb_profiles_update on public.tmb_profiles
  for update to authenticated
  using (id = auth.uid() or public.tmb_is_admin())
  with check (id = auth.uid() or public.tmb_is_admin());

-- Pas d'insert client : la création passe uniquement par le trigger
-- tmb_handle_new_user (SECURITY DEFINER, bypass RLS).
drop policy if exists tmb_profiles_delete on public.tmb_profiles;
create policy tmb_profiles_delete on public.tmb_profiles
  for delete to authenticated using (public.tmb_is_admin());

-- ---------- tmb_training_plans ----------
drop policy if exists tmb_plans_select on public.tmb_training_plans;
create policy tmb_plans_select on public.tmb_training_plans
  for select to authenticated using (true);

drop policy if exists tmb_plans_write on public.tmb_training_plans;
create policy tmb_plans_write on public.tmb_training_plans
  for all to authenticated
  using (
    public.tmb_is_admin()
    or (public.tmb_is_coach() and category_id = public.tmb_current_category())
  )
  with check (
    public.tmb_is_admin()
    or (public.tmb_is_coach() and category_id = public.tmb_current_category())
  );

-- ---------- tmb_exercises ----------
drop policy if exists tmb_exercises_select on public.tmb_exercises;
create policy tmb_exercises_select on public.tmb_exercises
  for select to authenticated using (true);

drop policy if exists tmb_exercises_write on public.tmb_exercises;
create policy tmb_exercises_write on public.tmb_exercises
  for all to authenticated
  using (
    public.tmb_is_admin()
    or exists (
      select 1 from public.tmb_training_plans p
      where p.id = plan_id
        and public.tmb_is_coach()
        and p.category_id = public.tmb_current_category()
    )
  )
  with check (
    public.tmb_is_admin()
    or exists (
      select 1 from public.tmb_training_plans p
      where p.id = plan_id
        and public.tmb_is_coach()
        and p.category_id = public.tmb_current_category()
    )
  );

-- ---------- tmb_player_validations ----------
drop policy if exists tmb_validations_select on public.tmb_player_validations;
create policy tmb_validations_select on public.tmb_player_validations
  for select to authenticated using (
    player_id = auth.uid()
    or public.tmb_is_admin()
    or (
      public.tmb_is_coach()
      and exists (
        select 1 from public.tmb_exercises e
        join public.tmb_training_plans p on p.id = e.plan_id
        where e.id = exercise_id and p.category_id = public.tmb_current_category()
      )
    )
  );

drop policy if exists tmb_validations_write on public.tmb_player_validations;
create policy tmb_validations_write on public.tmb_player_validations
  for all to authenticated
  using (player_id = auth.uid() or public.tmb_is_admin())
  with check (player_id = auth.uid() or public.tmb_is_admin());

-- ============================================================
-- ANCIEN SYSTÈME (v1) — conservé tel quel, non utilisé par l'app v2.
-- À supprimer manuellement une fois la migration des données de
-- tmb_players (progression locale par identifiant/mot de passe)
-- terminée, si nécessaire :
--   drop table if exists public.tmb_players cascade;
--   drop function if exists public.tmb_login_or_signup(text, text);
--   drop function if exists public.tmb_save_state(text, text, text, int, text, jsonb);
-- ============================================================
