-- ============================================================
-- TMB SUMMER BOOK — Schéma Supabase
-- Tables préfixées "tmb_" : instance Supabase partagée entre plusieurs
-- projets, on reste isolé du reste sans schéma dédié (PostgREST
-- n'expose que "public" par défaut).
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.tmb_players (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  category text not null default 'u1315',
  week_index int not null default 0,
  theme text not null default 'light',
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tmb_players enable row level security;
-- Aucune policy : la table est totalement fermée à anon/authenticated.
-- Seules les fonctions SECURITY DEFINER ci-dessous peuvent la lire/écrire,
-- après vérification du mot de passe (hashé via pgcrypto).
revoke all on public.tmb_players from anon, authenticated;

-- Connexion / création automatique du joueur au premier login.
create or replace function public.tmb_login_or_signup(p_username text, p_password text)
returns table (category text, week_index int, theme text, progress jsonb)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.tmb_players%rowtype;
begin
  if length(trim(p_username)) = 0 or length(p_password) < 3 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_row from public.tmb_players where username = p_username;

  if not found then
    insert into public.tmb_players (username, password_hash)
    values (p_username, crypt(p_password, gen_salt('bf')))
    returning * into v_row;
  else
    if v_row.password_hash <> crypt(p_password, v_row.password_hash) then
      raise exception 'INVALID_PASSWORD';
    end if;
  end if;

  return query select v_row.category, v_row.week_index, v_row.theme, v_row.progress;
end;
$$;

-- Sauvegarde de l'état (catégorie, semaine, thème, progression).
create or replace function public.tmb_save_state(
  p_username text, p_password text, p_category text,
  p_week_index int, p_theme text, p_progress jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.tmb_players%rowtype;
begin
  select * into v_row from public.tmb_players where username = p_username;
  if not found or v_row.password_hash <> crypt(p_password, v_row.password_hash) then
    raise exception 'INVALID_CREDENTIALS';
  end if;

  update public.tmb_players
  set category = p_category,
      week_index = p_week_index,
      theme = p_theme,
      progress = p_progress,
      updated_at = now()
  where username = p_username;

  return true;
end;
$$;

grant execute on function public.tmb_login_or_signup(text, text) to anon, authenticated;
grant execute on function public.tmb_save_state(text, text, text, int, text, jsonb) to anon, authenticated;
