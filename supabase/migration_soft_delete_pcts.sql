-- Soft delete para PCTs
-- Mantém o histórico em banco para auditoria, sem expor o registro na tela principal.

alter table public.pcts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create index if not exists idx_pcts_deleted_at on public.pcts(deleted_at);

-- Se a tabela ainda estiver em uma versão antiga, este passo garante que a coluna exista antes do view
-- tentar acessá-la.

create or replace view public.vw_pcts_totais as
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
group by p.id, p.codigo, p.nome, p.logradouro, p.cep, p.ponto_referencia, p.status,
  p.alvt_id, p.secoes_proprias, p.transmite_secoes_proprias, p.agrega_locais_satelites,
  p.conectividade, p.possui_nobreak, p.ponto_rede_homologado, p.observacoes_tecnicas,
  p.deleted_at, p.deleted_by, p.created_by, p.created_at, p.updated_at;

create or replace view public.vw_kpis_gerais as
select
  (select count(*) from public.pcts where deleted_at is null) as total_pcts_ativos,
  (select coalesce(sum(secoes_totais), 0) from public.vw_pcts_totais) as total_secoes_atendidas,
  (select count(distinct lv.pct_id) from public.locais_vinculados lv
   join public.pcts p on p.id = lv.pct_id
   where p.deleted_at is null) as pcts_com_locais_vinculados,
  (select count(*) from public.locais_vinculados lv
   join public.pcts p on p.id = lv.pct_id
   where p.deleted_at is null) as total_locais_vinculados,
  (select count(*) from public.alvts) as total_alvts,
  (select count(*) from public.alvts where treinado and homologado) as alvts_treinados_homologados;

-- Observação:
-- A exclusão do frontend deve atualizar apenas deleted_at e deleted_by,
-- sem remover a linha original da tabela.
