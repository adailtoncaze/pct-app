-- ============================================================
-- Schema: Gestão e Monitoramento de PCT (Polos de Contingência
-- e Transmissão) da Justiça Eleitoral
-- Escopo: 10ª Zona Eleitoral de Guarabira (zona única, fixa)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUM: status de prontidão de transmissão ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_prontidao') then
    create type status_prontidao as enum (
      'pronto_transmissao',
      'em_teste_link'
    );
  end if;
end$$;

-- ---------- Perfis de usuário (login gerenciado pelo Supabase Auth) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cargo text,
  created_at timestamptz not null default now()
);

-- ---------- ALVT (Apoio Logístico à Votação e à Transmissão) ----------
create table if not exists public.alvts (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  matricula_eleitoral text not null,
  cpf text not null,
  telefone text not null,
  treinado boolean not null default false,
  homologado boolean not null default false,
  crachao_titularidade text check (crachao_titularidade in ('titular', 'suplente')) default 'titular',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PCTs ----------
-- Observação: não há mais vínculo com "zonas_eleitorais" — a aplicação
-- atende exclusivamente a 10ª Zona Eleitoral de Guarabira.
create table if not exists public.pcts (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  nome text not null,
  logradouro text not null,
  cep text,
  ponto_referencia text,
  status status_prontidao not null default 'em_teste_link',
  alvt_id uuid references public.alvts(id) on delete set null,
  secoes_proprias integer not null default 0,
  transmite_secoes_proprias boolean not null default true,
  agrega_locais_satelites boolean not null default false,
  conectividade text,
  possui_nobreak boolean not null default false,
  ponto_rede_homologado boolean not null default false,
  observacoes_tecnicas text,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pcts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create index if not exists idx_pcts_deleted_at on public.pcts(deleted_at);
create index if not exists idx_pcts_alvt on public.pcts(alvt_id);

-- ---------- Locais satélites vinculados a um PCT ----------
create table if not exists public.locais_vinculados (
  id uuid primary key default uuid_generate_v4(),
  pct_id uuid not null references public.pcts(id) on delete cascade,
  nome_escola text not null,
  secoes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_locais_vinculados_pct on public.locais_vinculados(pct_id);

-- ============================================================
-- VIEW: total de seções por PCT (próprias + vinculadas)
-- ============================================================
drop view if exists public.vw_kpis_gerais cascade;
drop view if exists public.vw_pcts_totais;

create view public.vw_pcts_totais as
select
  p.id,
  p.codigo,
  p.nome,
  p.logradouro,
  p.cep,
  p.ponto_referencia,
  p.status,
  p.alvt_id,
  p.secoes_proprias,
  p.transmite_secoes_proprias,
  p.agrega_locais_satelites,
  p.conectividade,
  p.possui_nobreak,
  p.ponto_rede_homologado,
  p.observacoes_tecnicas,
  p.deleted_at,
  p.deleted_by,
  p.created_by,
  p.created_at,
  p.updated_at,
  coalesce(sum(lv.secoes_count), 0)::int as secoes_vinculadas,
  (p.secoes_proprias + coalesce(sum(lv.secoes_count), 0))::int as secoes_totais
from public.pcts p
left join public.locais_vinculados lv on lv.pct_id = p.id
where p.deleted_at is null
group by
  p.id,
  p.codigo,
  p.nome,
  p.logradouro,
  p.cep,
  p.ponto_referencia,
  p.status,
  p.alvt_id,
  p.secoes_proprias,
  p.transmite_secoes_proprias,
  p.agrega_locais_satelites,
  p.conectividade,
  p.possui_nobreak,
  p.ponto_rede_homologado,
  p.observacoes_tecnicas,
  p.deleted_at,
  p.deleted_by,
  p.created_by,
  p.created_at,
  p.updated_at;

-- ============================================================
-- VIEW: KPIs consolidados (painel geral)
-- ============================================================
create view public.vw_kpis_gerais as
select
  (select count(*) from public.pcts where deleted_at is null) as total_pcts_ativos,
  (select coalesce(sum(secoes_totais), 0) from public.vw_pcts_totais) as total_secoes_atendidas,
  (
    select count(distinct lv.pct_id)
    from public.locais_vinculados lv
    join public.pcts p on p.id = lv.pct_id
    where p.deleted_at is null
  ) as pcts_com_locais_vinculados,
  (
    select count(*)
    from public.locais_vinculados lv
    join public.pcts p on p.id = lv.pct_id
    where p.deleted_at is null
  ) as total_locais_vinculados,
  (select count(*) from public.alvts) as total_alvts,
  (select count(*) from public.alvts where treinado and homologado) as alvts_treinados_homologados;

-- ============================================================
-- RLS (Row Level Security)
-- Regra: qualquer usuário autenticado pode ler e gerenciar os
-- dados (ajuste conforme perfis/roles específicos, se necessário)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.alvts enable row level security;
alter table public.pcts enable row level security;
alter table public.locais_vinculados enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_self_write" on public.profiles;
drop policy if exists "profiles_self_insert" on public.profiles;
drop policy if exists "authenticated_read_alvts" on public.alvts;
drop policy if exists "authenticated_write_alvts" on public.alvts;
drop policy if exists "authenticated_read_pcts" on public.pcts;
drop policy if exists "authenticated_write_pcts" on public.pcts;
drop policy if exists "authenticated_read_locais" on public.locais_vinculados;
drop policy if exists "authenticated_write_locais" on public.locais_vinculados;

create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id or auth.role() = 'authenticated');

create policy "profiles_self_write" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "authenticated_read_alvts" on public.alvts
  for select using (auth.role() = 'authenticated');

create policy "authenticated_write_alvts" on public.alvts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_read_pcts" on public.pcts
  for select using (auth.role() = 'authenticated');

create policy "authenticated_write_pcts" on public.pcts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_read_locais" on public.locais_vinculados
  for select using (auth.role() = 'authenticated');

create policy "authenticated_write_locais" on public.locais_vinculados
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Trigger: cria profile automaticamente ao criar usuário no auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
