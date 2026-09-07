-- ============================================================
-- Migração: remover o conceito de Zona Eleitoral múltipla.
-- Use este script SOMENTE se você já executou o schema.sql
-- original (com a tabela "zonas_eleitorais") em um projeto
-- Supabase existente. Caso esteja criando o banco do zero,
-- basta rodar o "schema.sql" atualizado.
-- ============================================================

-- As views abaixo dependem da coluna zona_eleitoral_id (via "select p.*"),
-- então precisam ser removidas ANTES de alterar a tabela "pcts".
-- A ordem importa: vw_kpis_gerais depende de vw_pcts_totais.
drop view if exists vw_kpis_gerais;
drop view if exists vw_pcts_totais;

-- Remove a coluna de vínculo em pcts (e seu índice)
drop index if exists idx_pcts_zona;
alter table pcts drop column if exists zona_eleitoral_id;

-- Remove as políticas de RLS da tabela zonas_eleitorais
drop policy if exists "authenticated_read_zonas" on zonas_eleitorais;
drop policy if exists "authenticated_write_zonas" on zonas_eleitorais;

-- Remove a tabela (não é mais necessária: única zona fixa)
drop table if exists zonas_eleitorais;

-- Recria as views já sem a coluna removida
create view vw_pcts_totais as
select
  p.*,
  coalesce(sum(lv.secoes_count), 0)::int as secoes_vinculadas,
  (p.secoes_proprias + coalesce(sum(lv.secoes_count), 0))::int as secoes_totais
from pcts p
left join locais_vinculados lv on lv.pct_id = p.id
group by p.id;

create view vw_kpis_gerais as
select
  (select count(*) from pcts) as total_pcts_ativos,
  (select coalesce(sum(secoes_totais), 0) from vw_pcts_totais) as total_secoes_atendidas,
  (select count(distinct pct_id) from locais_vinculados) as pcts_com_locais_vinculados,
  (select count(*) from locais_vinculados) as total_locais_vinculados,
  (select count(*) from alvts) as total_alvts,
  (select count(*) from alvts where treinado and homologado) as alvts_treinados_homologados;