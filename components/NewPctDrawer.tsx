"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALVT, PCT, StatusProntidao } from "@/lib/types";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

interface LocalSatelite {
  nome_escola: string;
  secoes_count: number;
}

export function NewPctDrawer({
  open,
  onClose,
  onCreated,
  mode = "create",
  pctToEdit,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  mode?: "create" | "edit";
  pctToEdit?: PCT | null;
}) {
  const supabase = createClient();

  const [alvts, setAlvts] = useState<ALVT[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Identificação
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState<StatusProntidao>("em_teste_link");

  // Localização
  const [logradouro, setLogradouro] = useState("");
  const [cep, setCep] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");

  // ALVT
  const [alvtId, setAlvtId] = useState("");
  const [novoAlvtNome, setNovoAlvtNome] = useState("");
  const [novoAlvtTelefone, setNovoAlvtTelefone] = useState("");
  const [criarNovoAlvt, setCriarNovoAlvt] = useState(false);

  // Escopo e vinculação
  const [transmiteProprias, setTransmiteProprias] = useState(true);
  const [secoesProprias, setSecoesProprias] = useState<number>(0);
  const [agregaSatelites, setAgregaSatelites] = useState(false);
  const [locaisSatelites, setLocaisSatelites] = useState<LocalSatelite[]>([]);

  // Observações técnicas
  const [conectividade, setConectividade] = useState("");
  const [possuiNobreak, setPossuiNobreak] = useState(false);
  const [pontoRedeHomologado, setPontoRedeHomologado] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;

    const carregarAlvts = async () => {
      const { data: a } = await supabase
        .from("alvts")
        .select("id, nome, matricula_eleitoral, telefone, treinado, homologado, crachao_titularidade, cpf")
        .order("nome");
      setAlvts((a as ALVT[]) ?? []);
    };

    carregarAlvts();

    if (mode === "edit" && pctToEdit) {
      setNome(pctToEdit.nome ?? "");
      setCodigo(pctToEdit.codigo ?? "");
      setStatus(pctToEdit.status ?? "em_teste_link");
      setLogradouro(pctToEdit.logradouro ?? "");
      setCep(pctToEdit.cep ?? "");
      setPontoReferencia(pctToEdit.ponto_referencia ?? "");
      setAlvtId(pctToEdit.alvt_id ?? "");
      setCriarNovoAlvt(false);
      setNovoAlvtNome(pctToEdit.alvt?.nome ?? "");
      setNovoAlvtTelefone(pctToEdit.alvt?.telefone ?? "");
      setTransmiteProprias(Boolean(pctToEdit.transmite_secoes_proprias));
      setSecoesProprias(Number(pctToEdit.secoes_proprias ?? 0));
      setAgregaSatelites(Boolean(pctToEdit.agrega_locais_satelites));
      setLocaisSatelites(
        (pctToEdit.locais_vinculados ?? []).map((local) => ({
          nome_escola: local.nome_escola,
          secoes_count: local.secoes_count,
        }))
      );
      setConectividade(pctToEdit.conectividade ?? "");
      setPossuiNobreak(Boolean(pctToEdit.possui_nobreak));
      setPontoRedeHomologado(Boolean(pctToEdit.ponto_rede_homologado));
      setObservacoes(pctToEdit.observacoes_tecnicas ?? "");
      setErro(null);
      return;
    }

    resetForm();
  }, [open, mode, pctToEdit, supabase]);

  const cargaTotalSecoes = useMemo(() => {
    const proprias = transmiteProprias ? secoesProprias : 0;
    const vinculadas = agregaSatelites
      ? locaisSatelites.reduce((acc, l) => acc + (l.secoes_count || 0), 0)
      : 0;
    return proprias + vinculadas;
  }, [transmiteProprias, secoesProprias, agregaSatelites, locaisSatelites]);

  function addLocalSatelite() {
    setLocaisSatelites((prev) => [...prev, { nome_escola: "", secoes_count: 0 }]);
  }

  function updateLocalSatelite(index: number, patch: Partial<LocalSatelite>) {
    setLocaisSatelites((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLocalSatelite(index: number) {
    setLocaisSatelites((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setNome("");
    setCodigo("");
    setStatus("em_teste_link");
    setLogradouro("");
    setCep("");
    setPontoReferencia("");
    setAlvtId("");
    setCriarNovoAlvt(false);
    setNovoAlvtNome("");
    setNovoAlvtTelefone("");
    setTransmiteProprias(true);
    setSecoesProprias(0);
    setAgregaSatelites(false);
    setLocaisSatelites([]);
    setConectividade("");
    setPossuiNobreak(false);
    setPontoRedeHomologado(false);
    setObservacoes("");
    setErro(null);
  }

  function validarFormulario() {
    if (!nome.trim()) return "O campo Nome do local polo é obrigatório.";
    if (!codigo.trim()) return "O campo Código é obrigatório.";
    if (!logradouro.trim()) return "O campo Logradouro é obrigatório.";

    if (!transmiteProprias && !agregaSatelites) {
      return "Selecione ao menos um escopo: seções próprias e/ou locais satélites.";
    }

    if (mode === "edit") {
      if (!novoAlvtNome.trim()) return "Informe o nome do responsável ALVT.";
      if (!novoAlvtTelefone.trim()) return "Informe o telefone do responsável ALVT.";
    } else if (criarNovoAlvt) {
      if (!novoAlvtNome.trim()) return "Informe o nome do novo responsável ALVT.";
      if (!novoAlvtTelefone.trim()) return "Informe o telefone do novo responsável ALVT.";
    } else if (!alvtId) {
      return "Selecione um ALVT ou cadastre um novo responsável.";
    }

    if (agregaSatelites) {
      const localSemNome = locaisSatelites.find((local) => local.nome_escola.trim() === "");
      if (localSemNome) return "Preencha o nome de todos os locais satélites vinculados.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const mensagemErro = validarFormulario();
    if (mensagemErro) {
      setErro(mensagemErro);
      setToast({ type: "warning", message: mensagemErro });
      return;
    }

    setSalvando(true);
    try {
      let alvtIdFinal = alvtId || null;

      if (mode === "edit" && pctToEdit?.alvt_id) {
        const { data: outrosPcts, error: erroBuscaPcts } = await supabase
          .from("pcts")
          .select("id")
          .eq("alvt_id", pctToEdit.alvt_id)
          .neq("id", pctToEdit.id)
          .limit(1);

        if (erroBuscaPcts) throw erroBuscaPcts;

        if (outrosPcts && outrosPcts.length > 0) {
          const { data: novoAlvt, error: erroAlvt } = await supabase
            .from("alvts")
            .insert({
              nome: novoAlvtNome.trim(),
              cpf: "",
              telefone: novoAlvtTelefone.trim(),
              matricula_eleitoral: "",
              treinado: false,
              homologado: false,
              crachao_titularidade: "titular",
            })
            .select()
            .single();

          if (erroAlvt) throw erroAlvt;
          alvtIdFinal = novoAlvt.id;
        } else {
          const { error: erroAlvt } = await supabase
            .from("alvts")
            .update({
              nome: novoAlvtNome.trim(),
              telefone: novoAlvtTelefone.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", pctToEdit.alvt_id);

          if (erroAlvt) throw erroAlvt;
          alvtIdFinal = pctToEdit.alvt_id;
        }
      } else if (mode === "edit" && !pctToEdit?.alvt_id) {
        // Editando um PCT que não tinha ALVT - criar novo
        const { data: novoAlvt, error: erroAlvt } = await supabase
          .from("alvts")
          .insert({
            nome: novoAlvtNome.trim(),
            cpf: "",
            telefone: novoAlvtTelefone.trim(),
            matricula_eleitoral: "",
            treinado: false,
            homologado: false,
            crachao_titularidade: "titular",
          })
          .select()
          .single();

        if (erroAlvt) throw erroAlvt;
        alvtIdFinal = novoAlvt.id;
      } else if (criarNovoAlvt) {
        const { data: novoAlvt, error: erroAlvt } = await supabase
          .from("alvts")
          .insert({
            nome: novoAlvtNome,
            cpf: "",
            telefone: novoAlvtTelefone,
            matricula_eleitoral: "",
            treinado: false,
            homologado: false,
            crachao_titularidade: "titular",
          })
          .select()
          .single();

        if (erroAlvt) throw erroAlvt;
        alvtIdFinal = novoAlvt.id;
      }

      const payload = {
        nome,
        codigo,
        status,
        logradouro,
        cep: cep || null,
        ponto_referencia: pontoReferencia || null,
        alvt_id: alvtIdFinal,
        transmite_secoes_proprias: transmiteProprias,
        secoes_proprias: transmiteProprias ? secoesProprias : 0,
        agrega_locais_satelites: agregaSatelites,
        conectividade: conectividade || null,
        possui_nobreak: possuiNobreak,
        ponto_rede_homologado: pontoRedeHomologado,
        observacoes_tecnicas: observacoes || null,
        updated_at: new Date().toISOString(),
        ...(mode === "create" ? { status: "em_teste_link" } : {}),
      };

      if (mode === "edit" && pctToEdit) {
        const { error: erroPct } = await supabase.from("pcts").update(payload).eq("id", pctToEdit.id);
        if (erroPct) throw erroPct;

        const { error: erroDelete } = await supabase
          .from("locais_vinculados")
          .delete()
          .eq("pct_id", pctToEdit.id);
        if (erroDelete) throw erroDelete;

        if (agregaSatelites && locaisSatelites.length > 0) {
          const validos = locaisSatelites.filter((l) => l.nome_escola.trim() !== "");
          if (validos.length > 0) {
            const { error: erroLocais } = await supabase.from("locais_vinculados").insert(
              validos.map((l) => ({
                pct_id: pctToEdit.id,
                nome_escola: l.nome_escola,
                secoes_count: l.secoes_count,
              }))
            );
            if (erroLocais) throw erroLocais;
          }
        }
      } else {
        const { data: novoPct, error: erroPct } = await supabase
          .from("pcts")
          .insert({
            ...payload,
            status: "em_teste_link",
          })
          .select()
          .single();

        if (erroPct) throw erroPct;

        if (agregaSatelites && locaisSatelites.length > 0) {
          const { error: erroLocais } = await supabase.from("locais_vinculados").insert(
            locaisSatelites
              .filter((l) => l.nome_escola.trim() !== "")
              .map((l) => ({
                pct_id: novoPct.id,
                nome_escola: l.nome_escola,
                secoes_count: l.secoes_count,
              }))
          );
          if (erroLocais) throw erroLocais;
        }
      }

      resetForm();
      setToast({
        type: "success",
        message: mode === "edit" ? "PCT atualizado com sucesso!" : "PCT cadastrado com sucesso!",
      });
      onCreated();
      onClose();
    } catch (err: any) {
      const mensagem = err.message ?? "Erro ao salvar o PCT. Tente novamente.";
      setErro(mensagem);
      setToast({ type: "error", message: mensagem });
    } finally {
      setSalvando(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]" onClick={onClose} />

      {toast && (
        <div
          className={[
            "pointer-events-none absolute right-6 top-6 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
            toast.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            toast.type === "error" && "border-red-200 bg-red-50 text-red-700",
            toast.type === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <div className="teams-modal relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden bg-slate-50/95">
        <div className="flex items-center justify-between border-b border-pct-border bg-slate-50/80 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 className="text-base font-semibold text-pct-text">
              {mode === "edit" ? "Editar PCT" : "Cadastrar Novo PCT"}
            </h2>
            <p className="text-xs text-pct-muted">
              {mode === "edit" ? "Atualizar polo e escopo de transmissão" : "Adicionar polo e escopo de transmissão"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-pct-muted hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/40">
            <div className="grid grid-cols-1 gap-4">
              <section className="space-y-3 rounded-xl bg-white p-3.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
                  Identificação
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-pct-muted">
                    Nome do local polo <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="teams-input"
                    placeholder="Ex: Escola Municipal João XXIII"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-pct-muted">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="teams-input"
                    placeholder="PCT-01"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-pct-muted">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusProntidao)}
                    className="teams-input"
                  >
                    <option value="em_teste_link">Em Teste de Link</option>
                    <option value="pronto_transmissao">Pronto para Transmissão</option>
                  </select>
                </div>
              </section>

              <section className="space-y-3 rounded-xl bg-white p-3.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
                  Localização
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-pct-muted">
                    Logradouro <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="teams-input"
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-pct-muted">CEP</label>
                    <input
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="teams-input"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-pct-muted">Ponto de referência</label>
                    <input
                      value={pontoReferencia}
                      onChange={(e) => setPontoReferencia(e.target.value)}
                      className="teams-input"
                      placeholder="Próximo à praça central"
                    />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4">
                <section className="space-y-3 rounded-xl bg-white p-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
                    Responsável ALVT
                  </h3>

                  {mode === "edit" && pctToEdit?.alvt_id ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <label className="mb-1 block text-xs font-medium text-pct-muted">
                        Nome do responsável ALVT <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        value={novoAlvtNome}
                        onChange={(e) => setNovoAlvtNome(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                      />
                      <label className="mb-1 block text-xs font-medium text-pct-muted">
                        Telefone do responsável ALVT <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        value={novoAlvtTelefone}
                        onChange={(e) => setNovoAlvtTelefone(e.target.value)}
                        placeholder="Telefone de contato"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                      />
                    </div>
                  ) : mode === "edit" && !pctToEdit?.alvt_id ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs text-pct-muted mb-3">
                        Este PCT ainda não tem um responsável ALVT. Preencha os dados abaixo para criar um novo.
                      </p>
                      <label className="mb-1 block text-xs font-medium text-pct-muted">
                        Nome do responsável ALVT <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        value={novoAlvtNome}
                        onChange={(e) => setNovoAlvtNome(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                      />
                      <label className="mb-1 block text-xs font-medium text-pct-muted">
                        Telefone do responsável ALVT <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        value={novoAlvtTelefone}
                        onChange={(e) => setNovoAlvtTelefone(e.target.value)}
                        placeholder="Telefone de contato"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                      />
                    </div>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={criarNovoAlvt}
                          onChange={(e) => setCriarNovoAlvt(e.target.checked)}
                          className="h-4 w-4 rounded border-pct-border accent-pct-accent"
                        />
                        Cadastrar novo servidor/colaborador
                      </label>

                      {!criarNovoAlvt ? (
                        <select
                          value={alvtId}
                          onChange={(e) => setAlvtId(e.target.value)}
                          className="teams-input"
                        >
                          <option value="">Selecione um ALVT já convocado...</option>
                          {alvts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                          <label className="mb-1 block text-xs font-medium text-pct-muted">
                            Nome do responsável ALVT <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={novoAlvtNome}
                            onChange={(e) => setNovoAlvtNome(e.target.value)}
                            placeholder="Nome completo"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                          />
                          <label className="mb-1 block text-xs font-medium text-pct-muted">
                            Telefone do responsável ALVT <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={novoAlvtTelefone}
                            onChange={(e) => setNovoAlvtTelefone(e.target.value)}
                            placeholder="Telefone de contato"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                          />
                        </div>
                      )}
                    </>
                  )}
                </section>

                <section className="space-y-3 rounded-xl bg-white p-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
                    Escopo e Vinculação de Locais
                  </h3>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={transmiteProprias}
                      onChange={(e) => setTransmiteProprias(e.target.checked)}
                      className="h-4 w-4 rounded border-pct-border accent-pct-accent"
                    />
                    Transmite seções próprias
                  </label>
                  {transmiteProprias && (
                    <input
                      type="number"
                      min={0}
                      value={secoesProprias}
                      onChange={(e) => setSecoesProprias(Number(e.target.value))}
                      placeholder="Quantidade de seções próprias"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                    />
                  )}

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={agregaSatelites}
                      onChange={(e) => setAgregaSatelites(e.target.checked)}
                      className="h-4 w-4 rounded border-pct-border accent-pct-accent"
                    />
                    Agrega escolas satélites
                  </label>

                  {agregaSatelites && (
                    <div className="space-y-2">
                      {locaisSatelites.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={l.nome_escola}
                            onChange={(e) => updateLocalSatelite(i, { nome_escola: e.target.value })}
                            placeholder="Nome da escola satélite"
                            className="teams-input flex-1"
                          />
                          <input
                            type="number"
                            min={0}
                            value={l.secoes_count}
                            onChange={(e) =>
                              updateLocalSatelite(i, { secoes_count: Number(e.target.value) })
                            }
                            placeholder="Seções"
                            className="teams-input w-24"
                          />
                          <button
                            type="button"
                            onClick={() => removeLocalSatelite(i)}
                            className="rounded-lg border border-slate-200 bg-white px-2 text-slate-400 hover:bg-slate-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addLocalSatelite}
                        className="flex items-center gap-1.5 text-xs font-medium text-pct-accent hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar local satélite
                      </button>
                    </div>
                  )}

                  <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
                    Carga total de seções a transmitir: {cargaTotalSecoes}
                  </div>
                </section>
              </div>

              <section className="space-y-3 rounded-xl bg-white p-3.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
                  Observações Técnicas
                </h3>
                <input
                  value={conectividade}
                  onChange={(e) => setConectividade(e.target.value)}
                  placeholder="Conectividade (ex: Fibra, 4G, Rádio)"
                  className="w-full rounded-lg border border-pct-border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                />
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={possuiNobreak}
                      onChange={(e) => setPossuiNobreak(e.target.checked)}
                      className="h-4 w-4 rounded border-pct-border accent-pct-accent"
                    />
                    Possui no-break
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={pontoRedeHomologado}
                      onChange={(e) => setPontoRedeHomologado(e.target.checked)}
                      className="h-4 w-4 rounded border-pct-border accent-pct-accent"
                    />
                    Ponto de rede homologado
                  </label>
                </div>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Observações adicionais..."
                  className="w-full rounded-lg border border-pct-border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pct-accent focus:ring-1 focus:ring-pct-accent"
                />
              </section>

              {erro && <p className="xl:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{erro}</p>}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 border-t border-pct-border bg-slate-50/80 px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={salvando}
            className="teams-button-primary flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Salvar alterações" : "Salvar PCT"}
          </button>
          <button
            onClick={onClose}
            type="button"
            className="teams-button-secondary"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
