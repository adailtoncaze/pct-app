export type StatusProntidao = "pronto_transmissao" | "em_teste_link";

export interface ALVT {
  id: string;
  nome: string;
  matricula_eleitoral: string;
  cpf: string;
  telefone: string;
  treinado: boolean;
  homologado: boolean;
  crachao_titularidade: "titular" | "suplente";
}

export interface LocalVinculado {
  id: string;
  pct_id: string;
  nome_escola: string;
  secoes_count: number;
}

export interface PCT {
  id: string;
  codigo: string;
  nome: string;
  logradouro: string;
  cep: string | null;
  ponto_referencia: string | null;
  status: StatusProntidao;
  alvt_id: string | null;
  secoes_proprias: number;
  transmite_secoes_proprias: boolean;
  agrega_locais_satelites: boolean;
  conectividade: string | null;
  possui_nobreak: boolean;
  ponto_rede_homologado: boolean;
  observacoes_tecnicas: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
  alvt?: ALVT | null;
  locais_vinculados?: LocalVinculado[];
  secoes_vinculadas?: number;
  secoes_totais?: number;
}

export interface KpisGerais {
  total_pcts_ativos: number;
  total_secoes_atendidas: number;
  pcts_com_locais_vinculados: number;
  total_locais_vinculados: number;
  total_alvts: number;
  alvts_treinados_homologados: number;
}

export const STATUS_LABELS: Record<StatusProntidao, string> = {
  pronto_transmissao: "Pronto para Transmissão",
  em_teste_link: "Em Teste de Link",
};

// Cores calibradas para fundo claro (light mode)
export const STATUS_COLORS: Record<StatusProntidao, string> = {
  pronto_transmissao: "bg-pct-accent/10 text-pct-accent border-pct-accent/20",
  em_teste_link: "bg-amber-50 text-amber-700 border-amber-200",
};

export const ZONA_ELEITORAL_NOME = "10ª Zona Eleitoral de Guarabira";
