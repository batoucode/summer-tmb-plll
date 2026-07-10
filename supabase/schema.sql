-- ============================================================
-- TMB SUMMER BOOK — Schéma Supabase (v3 — plateforme multi-rôles,
-- programme organisé par jour)
-- Tables préfixées "tmb_" : instance Supabase partagée entre plusieurs
-- projets, on reste isolé du reste sans schéma dédié (PostgREST
-- n'expose que "public" par défaut).
--
-- v3 réintroduit la granularité par jour (comme la toute première
-- version de l'app, en localStorage) à l'intérieur du plan hebdomadaire
-- multi-rôles v2 : chaque plan (catégorie + semaine) contient jusqu'à
-- 8 "jours" (Lundi à Dimanche + un slot bonus "Défi") et les exercices
-- sont rattachés à un jour, pas directement au plan. Ça permet au
-- joueur de valider ses séances jour par jour, comme dans le programme
-- papier original.
--
-- Idempotent : peut être rejoué sans erreur sur une base déjà migrée
-- (y compris depuis le schéma v2 — voir la section MIGRATION v2 → v3).
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
-- 2bis. IDENTIFIANT DE CONNEXION (remplace l'email comme moyen de
--    connexion — l'email reste stocké mais devient optionnel/informatif).
--    Unique insensible à la casse, format simple (lettres/chiffres/
--    ._- , 3 à 24 caractères).
-- ------------------------------------------------------------
alter table public.tmb_profiles add column if not exists username text;

create unique index if not exists tmb_profiles_username_lower_idx
  on public.tmb_profiles (lower(username));

alter table public.tmb_profiles drop constraint if exists tmb_profiles_username_format;
alter table public.tmb_profiles add constraint tmb_profiles_username_format
  check (username is null or username ~ '^[a-zA-Z0-9_.-]{3,24}$');

-- Backfill des comptes déjà existants (créés avant l'ajout de la colonne) :
-- identifiant dérivé de prénom+nom, suffixe numérique en cas de collision.
-- Idempotent : ne touche que les lignes où username est encore null.
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in select id, first_name, last_name from public.tmb_profiles where username is null order by created_at loop
    base := regexp_replace(lower(coalesce(r.first_name, '') || coalesce(r.last_name, '')), '[^a-z0-9]', '', 'g');
    if base = '' then
      base := 'joueur';
    end if;
    base := left(base, 20);
    candidate := base;
    n := 1;
    while exists (select 1 from public.tmb_profiles where lower(username) = candidate and id <> r.id) loop
      n := n + 1;
      candidate := left(base, 20) || n::text;
    end loop;
    update public.tmb_profiles set username = candidate where id = r.id;
  end loop;
end $$;

alter table public.tmb_profiles alter column username set not null;

-- ------------------------------------------------------------
-- 3. TRAINING PLANS — un plan = une catégorie + une semaine (1 à 5)
--    Contient uniquement les infos valables pour toute la semaine ;
--    l'échauffement et le RPE, spécifiques à chaque séance, sont
--    portés par tmb_training_days.
-- ------------------------------------------------------------
create table if not exists public.tmb_training_plans (
  id uuid primary key default gen_random_uuid(),
  category_id int not null references public.tmb_categories(id) on delete cascade,
  week_number int not null check (week_number between 1 and 5),
  objective text,
  staff_quote text,
  updated_at timestamptz not null default now(),
  unique (category_id, week_number)
);
-- Migration douce v2 → v3 : les champs hebdo warmup/rpe sont remplacés
-- par les mêmes champs au niveau du jour (tmb_training_days).
alter table public.tmb_training_plans add column if not exists staff_quote text;
alter table public.tmb_training_plans drop column if exists warmup;
alter table public.tmb_training_plans drop column if exists rpe;

-- ------------------------------------------------------------
-- 4. TRAINING DAYS — une séance (ou un repos) dans la semaine
--    day_index : 0=Lundi … 6=Dimanche, 7=créneau bonus "Défi de la
--    semaine" (hors planning des 7 jours, optionnel).
-- ------------------------------------------------------------
create table if not exists public.tmb_training_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.tmb_training_plans(id) on delete cascade,
  day_index int not null check (day_index between 0 and 7),
  label text,
  is_rest boolean not null default false,
  warmup text,
  rpe text,
  unique (plan_id, day_index)
);
create index if not exists tmb_days_plan_idx on public.tmb_training_days (plan_id);

-- ------------------------------------------------------------
-- 5. EXERCISES — exercices d'un jour donné
-- ------------------------------------------------------------
create table if not exists public.tmb_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid references public.tmb_training_days(id) on delete cascade,
  name text not null,
  sets int,
  duration int,        -- en secondes
  intensity int check (intensity between 1 and 10),
  reps text,            -- consigne brute (ex. "3 X 10", "2 X 30 sec") — complète sets/duration
                          -- quand la prescription originale n'est pas réductible à un seul nombre
  position int not null default 0,
  video_url text
);

-- ---- MIGRATION v2 → v3 --------------------------------------------
-- La v2 rattachait les exercices directement au plan (colonne plan_id).
-- Comme le regroupement par jour change la structure des données (et
-- qu'aucune app en prod ne dépend encore de la v2 fraîchement introduite),
-- on repart d'exercices/validations vides plutôt que de tenter une
-- reconstitution automatique impossible à fiabiliser. Réimporter les
-- données par défaut depuis l'espace Admin après migration.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tmb_exercises' and column_name = 'plan_id'
  ) then
    execute 'truncate table public.tmb_player_validations, public.tmb_exercises';
    execute 'alter table public.tmb_exercises drop column plan_id';
  end if;
end $$;

alter table public.tmb_exercises add column if not exists day_id uuid references public.tmb_training_days(id) on delete cascade;
create index if not exists tmb_exercises_day_idx on public.tmb_exercises (day_id);

-- ------------------------------------------------------------
-- 6. PLAYER VALIDATIONS — 1 ligne par (joueur, exercice)
--    Le statut "jour validé" est dérivé côté app : un jour est complet
--    quand tous ses exercices sont validated = true (pas de table dédiée,
--    une seule source de vérité). Le bouton "Valider toute la séance"
--    de l'app fait un upsert groupé sur tous les exercices du jour.
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
-- CONNEXION PAR IDENTIFIANT
-- Supabase Auth reste géré par email en interne ; ces fonctions
-- permettent au client (non connecté, donc "anon") de faire la
-- correspondance identifiant → email avant d'appeler
-- signInWithPassword, et de vérifier la disponibilité d'un identifiant
-- à l'inscription. SECURITY DEFINER + retour minimal (pas de ligne
-- complète) pour ne pas exposer tmb_profiles à anon.
-- ============================================================
create or replace function public.tmb_email_for_username(p_username text)
returns text
language sql stable security definer set search_path = public as $$
  select email from public.tmb_profiles where lower(username) = lower(p_username) limit 1;
$$;
revoke all on function public.tmb_email_for_username(text) from public;
grant execute on function public.tmb_email_for_username(text) to anon, authenticated;

create or replace function public.tmb_username_available(p_username text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.tmb_profiles where lower(username) = lower(p_username));
$$;
revoke all on function public.tmb_username_available(text) from public;
grant execute on function public.tmb_username_available(text) to anon, authenticated;

-- ============================================================
-- CRÉATION AUTOMATIQUE DU PROFIL AU SIGNUP
-- Lit username / first_name / last_name / assigned_category_id depuis
-- les métadonnées passées à supabase.auth.signUp({ options: { data: {...} } }).
-- La catégorie est choisie directement par l'utilisateur à l'inscription
-- (n'est plus déduite de la date de naissance). Rôle toujours "player"
-- à la création ; l'admin promeut ensuite.
-- ============================================================
create or replace function public.tmb_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cat_id int;
  v_role text := 'player';
begin
  begin
    v_cat_id := (new.raw_user_meta_data ->> 'assigned_category_id')::int;
  exception when others then
    v_cat_id := null;
  end;

  -- Bootstrap : le tout premier compte créé sur l'instance devient admin
  -- automatiquement (aucun autre moyen de créer le 1er admin sans clé
  -- service_role, qui n'est jamais exposée côté client).
  if not exists (select 1 from public.tmb_profiles) then
    v_role := 'admin';
  end if;

  insert into public.tmb_profiles (id, email, username, first_name, last_name, role, assigned_category_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
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
-- GARDE-FOU : seul un admin peut changer role (empêche un joueur de se
-- promouvoir lui-même via une requête directe). assigned_category_id
-- est volontairement modifiable par soi-même depuis l'écran Paramètres
-- (coach/joueur peuvent changer leur propre catégorie).
-- ============================================================
create or replace function public.tmb_guard_profile_update()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.tmb_is_admin() then
    new.role := old.role;
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
alter table public.tmb_training_days enable row level security;
alter table public.tmb_exercises enable row level security;
alter table public.tmb_player_validations enable row level security;

-- ---------- tmb_categories : lecture publique (y compris anon — le
--   formulaire d'inscription affiche le choix de catégorie avant
--   connexion), écriture admin ----------
drop policy if exists tmb_categories_select on public.tmb_categories;
create policy tmb_categories_select on public.tmb_categories
  for select to anon, authenticated using (true);

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

-- Un utilisateur peut mettre à jour sa propre ligne (prénom, nom,
-- username, catégorie...) ; seul "role" est verrouillé par le trigger
-- tmb_guard_profile_update pour les non-admins. L'admin peut modifier
-- n'importe quel profil.
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

-- ---------- tmb_training_days ----------
drop policy if exists tmb_days_select on public.tmb_training_days;
create policy tmb_days_select on public.tmb_training_days
  for select to authenticated using (true);

drop policy if exists tmb_days_write on public.tmb_training_days;
create policy tmb_days_write on public.tmb_training_days
  for all to authenticated
  using (
    public.tmb_is_admin()
    or exists (
      select 1 from public.tmb_training_plans p
      where p.id = plan_id and public.tmb_is_coach() and p.category_id = public.tmb_current_category()
    )
  )
  with check (
    public.tmb_is_admin()
    or exists (
      select 1 from public.tmb_training_plans p
      where p.id = plan_id and public.tmb_is_coach() and p.category_id = public.tmb_current_category()
    )
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
      select 1
      from public.tmb_training_days d
      join public.tmb_training_plans p on p.id = d.plan_id
      where d.id = day_id and public.tmb_is_coach() and p.category_id = public.tmb_current_category()
    )
  )
  with check (
    public.tmb_is_admin()
    or exists (
      select 1
      from public.tmb_training_days d
      join public.tmb_training_plans p on p.id = d.plan_id
      where d.id = day_id and public.tmb_is_coach() and p.category_id = public.tmb_current_category()
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
        select 1
        from public.tmb_exercises e
        join public.tmb_training_days d on d.id = e.day_id
        join public.tmb_training_plans p on p.id = d.plan_id
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
-- ANCIEN SYSTÈME (v1, pré-Supabase Auth) — conservé tel quel, non
-- utilisé par l'app v3. À supprimer manuellement si nécessaire :
--   drop table if exists public.tmb_players cascade;
--   drop function if exists public.tmb_login_or_signup(text, text);
--   drop function if exists public.tmb_save_state(text, text, text, int, text, jsonb);
-- ============================================================
