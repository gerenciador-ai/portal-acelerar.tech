"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

const EMPRESAS = [
  { id: 'consolidado', nome: "Grupo Acelerar", logo: "/logo_acelerar_sidebar.png" },
  { id: 'victec', nome: "Victec", logo: "/logo_victec.png" },
  { id: 'vmctech', nome: "VMC Tech", logo: "/logo_vmctech.png" },
  { id: 'grt', nome: "GRT", logo: "/logo_GRT.png" },
  { id: 'bllog', nome: "Bllog", logo: "/logo_bllog.png" },
  { id: 'm3', nome: "M3", logo: "/logo_m3sistemas.png" },
  { id: 'acelerar', nome: "Acelerar", logo: "/logo_acelerar_sidebar.png" },
  { id: 'blive', nome: "bLive", logo: "/logo_blive.png" },
  { id: 'condway', nome: "Condway", logo: "/logo_condway.png" },
  { id: 'isket', nome: "Isket", logo: "/logo_isket.png" }
];

const EMPRESAS_INDIVIDUAIS = EMPRESAS.filter(e => e.id !== 'consolidado');
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const anoAtualGlobal = new Date().getFullYear();
const ANOS_DISPONIVEIS = [0, 1, 2, 3, 4].map(i => anoAtualGlobal + i);

const ESTRUTURA_DRE = [
  { id: 'receitas_operacionais', nome: '(+) RECEITAS OPERACIONAIS',    tipo: 'grupo',     color: 'text-white/60',            bold: false, grupos: ['RECEITAS OPERACIONAIS'] },
  { id: 'receita_bruta',         nome: '(=) RECEITA BRUTA',            tipo: 'resultado', color: 'text-white',               bold: true,  grupos: [] },
  { id: 'deducoes',             nome: '(-) DEDUÇÕES E IMPOSTOS',        tipo: 'grupo',     color: 'text-white/60',            bold: false, grupos: ['(-) DEDUÇÕES E IMPOSTOS'] },
  { id: 'receita_liquida',      nome: '(=) RECEITA LÍQUIDA',            tipo: 'resultado', color: 'text-white/90',            bold: true,  grupos: [] },
  { id: 'custo_venda',          nome: '(-) CUSTO DE VENDA (CAC)',       tipo: 'grupo',     color: 'text-orange-400',          bold: false, grupos: ['(-) PESSOAL COMERCIAL', '(-) FERRAMENTAS E MKT COMERCIAL'] },
  { id: 'margem_contribuicao',  nome: '(=) MARGEM DE CONTRIBUIÇÃO',     tipo: 'resultado', color: 'text-acelerar-light-blue', bold: true,  grupos: [] },
  { id: 'custos_operacionais',  nome: '(-) CUSTOS OPERACIONAIS',        tipo: 'grupo',     color: 'text-white/60',            bold: false, grupos: ['(-) PESSOAL OPERACIONAL', '(-) INFRA E SOFTWARES OPERACIONAIS'] },
  { id: 'lucro_bruto',          nome: '(=) LUCRO BRUTO',                tipo: 'resultado', color: 'text-white/90',            bold: true,  grupos: [] },
  { id: 'despesas_adm',         nome: '(-) DESPESAS ADMINISTRATIVAS',   tipo: 'grupo',     color: 'text-white/60',            bold: false, grupos: ['(-) PESSOAL ADMINISTRATIVO', '(-) INFRA E GESTÃO ADMINISTRATIVA'] },
  { id: 'investimento_produto', nome: '(-) INVESTIMENTO EM PRODUTO',    tipo: 'grupo',     color: 'text-white/60',            bold: false, grupos: ['(-) INVESTIMENTO EM PRODUTO'] },
  { id: 'ebitda',               nome: '(=) EBITDA',                     tipo: 'resultado', color: 'text-green-400',           bold: true,  grupos: [] },
  { id: 'depreciacao',          nome: '(-) DEPRECIAÇÃO E AMORTIZAÇÃO',  tipo: 'grupo',     color: 'text-white/40',            bold: false, grupos: ['(-) DEPRECIAÇÃO E AMORTIZAÇÃO'] },
  { id: 'resultado_financeiro', nome: '(+/-) RESULTADO FINANCEIRO',     tipo: 'grupo',     color: 'text-white/40',            bold: false, grupos: ['(+/-) RESULTADO FINANCEIRO'] },
  { id: 'lair',                 nome: '(=) LUCRO ANTES DO IR/CSLL',     tipo: 'resultado', color: 'text-white/90',            bold: true,  grupos: [] },
  { id: 'ir_csll',              nome: '(-) IR / CSLL PROJETADO',        tipo: 'calculado', color: 'text-red-400',             bold: false, grupos: [] },
  { id: 'lucro_liquido',        nome: '(=) LUCRO LÍQUIDO FINAL',        tipo: 'resultado', color: 'text-green-500',           bold: true,  grupos: [] }
];

const fmt = (v) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(parseFloat(v) || 0);
const fmtPct = (v) => (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const zeros12 = () => Array(12).fill(0);

function EmpresaTab({ nome, logo, isActive, onClick }) {
  const isVMC = nome === 'VMC Tech';
  return (
    <button onClick={onClick} className={`relative flex items-center justify-center h-20 ${isVMC ? 'w-40' : 'w-28'} transition-all duration-200 border-b-2 ${isActive ? 'border-acelerar-light-blue bg-white/5' : 'border-transparent hover:bg-white/5'}`}>
      {logo && (
        <div className="relative w-full h-full p-3">
          <Image src={logo} alt={nome} fill className={`transition-opacity duration-200 object-contain p-2 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`} sizes="100px" priority />
        </div>
      )}
    </button>
  );
}

export default function DREPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(EMPRESAS[0]);
  const [anoAtivo, setAnoAtivo] = useState(anoAtualGlobal);
  const [loading, setLoading] = useState(false);
  const [dreData, setDreData] = useState({ orcamento: [], premissas: [] });
  const [versoes, setVersoes] = useState([]);
  const [versaoSelecionada, setVersaoSelecionada] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [planoContas, setPlanoContas] = useState([]);

  // Carrega plano de contas uma única vez
  useEffect(() => {
    fetch('/api/financeiro/fpa/dre?mode=plano')
      .then(r => r.json())
      .then(d => setPlanoContas(Array.isArray(d) ? d : []))
      .catch(() => setPlanoContas([]));
  }, []);

  // Carrega versões disponíveis ao trocar empresa/ano (apenas empresa individual)
  useEffect(() => {
    if (empresaAtiva.id === 'consolidado') {
      setVersoes([]);
      setVersaoSelecionada('');
      return;
    }
    fetch(`/api/financeiro/fpa/dre?mode=versoes&ano=${anoAtivo}`)
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d)
          ? d.filter(v => v.empresa_nome.toLowerCase() === empresaAtiva.id.toLowerCase())
          : [];
        setVersoes(lista);
        setVersaoSelecionada('');
      })
      .catch(() => setVersoes([]));
  }, [empresaAtiva, anoAtivo]);

  // Carrega dados do orçamento e premissas
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ empresa: empresaAtiva.id, ano: String(anoAtivo) });
    if (versaoSelecionada) params.set('versaoId', versaoSelecionada);
    fetch(`/api/financeiro/fpa/dre?${params.toString()}`)
      .then(r => r.json())
      .then(d => setDreData({
        orcamento: Array.isArray(d.orcamento) ? d.orcamento : [],
        premissas: Array.isArray(d.premissas) ? d.premissas : []
      }))
      .catch(() => setDreData({ orcamento: [], premissas: [] }))
      .finally(() => setLoading(false));
  }, [empresaAtiva, anoAtivo, versaoSelecionada]);

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── CÁLCULO PRINCIPAL DA DRE ─────────────────────────────────────────────
  const dreCalculada = useMemo(() => {
    const empresasList = empresaAtiva.id === 'consolidado' ? EMPRESAS_INDIVIDUAIS : [empresaAtiva];

    // Inicializa estrutura de acumulação
    const res = {};
    ESTRUTURA_DRE.forEach(l => {
      res[l.id] = { total: zeros12(), porEmpresa: {} };
      empresasList.forEach(e => { res[l.id].porEmpresa[e.id] = zeros12(); });
    });

    // Drill-down por categoria (empresa individual)
    const drillCategoria = {};
    ESTRUTURA_DRE.filter(l => l.tipo === 'grupo').forEach(l => { drillCategoria[l.id] = {}; });

    // 1. Acumula valores do orçamento base
    dreData.orcamento.forEach(item => {
      const mesIdx = (item.mes || 1) - 1;
      if (mesIdx < 0 || mesIdx > 11) return;
      const valor = parseFloat(item.valor_base) || 0;
      if (valor === 0) return;

      const empNome = (item.empresa_nome || '').toLowerCase();
      const empObj = empresasList.find(e =>
        e.id.toLowerCase() === empNome || e.nome.toLowerCase() === empNome
      );
      const empId = empObj ? empObj.id : null;

      ESTRUTURA_DRE.forEach(linha => {
        if (!linha.grupos || linha.grupos.length === 0) return;
        if (!linha.grupos.includes(item.grupo_dre)) return;

        res[linha.id].total[mesIdx] += valor;
        if (empId && res[linha.id].porEmpresa[empId] !== undefined) {
          res[linha.id].porEmpresa[empId][mesIdx] += valor;
        }

        // Drill-down por categoria (apenas empresa individual)
        if (empresaAtiva.id !== 'consolidado' && linha.tipo === 'grupo') {
          const catKey = item.codigo_9_digitos || item.categoria_nibo || item.grupo_dre;
          if (!drillCategoria[linha.id][catKey]) {
            const planoItem = planoContas.find(p =>
              p.codigo_9_digitos === catKey || p.categoria_nibo === catKey
            );
            drillCategoria[linha.id][catKey] = {
              descricao: planoItem?.descricao_orcamento || catKey,
              valores: zeros12()
            };
          }
          drillCategoria[linha.id][catKey].valores[mesIdx] += valor;
        }
      });
    });

    // 2. Aplica premissas (crescimento e IR/CSLL)
    empresasList.forEach(emp => {
      const premissa = dreData.premissas.find(p => p.empresa === emp.id);
      if (!premissa) return;

      for (let i = 0; i < 12; i++) {
        // Crescimento projetado — soma em receitas_operacionais (base da receita bruta)
        const mesInicioCresc = parseInt(premissa.crescimento_mes_inicio) || 1;
        if (i >= mesInicioCresc - 1) {
          let cresc = 0;
          if (premissa.crescimento_tipo === 'VALOR_FIXO') {
            cresc = parseFloat(premissa.crescimento_valor) || 0;
          } else {
            cresc = res['receitas_operacionais'].porEmpresa[emp.id][i] * ((parseFloat(premissa.crescimento_valor) || 0) / 100);
          }
          res['receitas_operacionais'].porEmpresa[emp.id][i] += cresc;
          res['receitas_operacionais'].total[i] += cresc;
        }

        // IR/CSLL projetado
        const mesInicioIR = parseInt(premissa.imposto_medio_mes_inicio) || 1;
        if (i >= mesInicioIR - 1) {
          const imp = res['receita_bruta'].porEmpresa[emp.id][i] * ((parseFloat(premissa.imposto_medio_percentual) || 0) / 100);
          res['ir_csll'].porEmpresa[emp.id][i] += imp;
          res['ir_csll'].total[i] += imp;
        }
      }
    });

    // 3. Calcula resultados intermediários
    for (let i = 0; i < 12; i++) {
      // Receita Bruta = soma das Receitas Operacionais + crescimento (já aplicado acima nas premissas)
      res['receita_bruta'].total[i]       = res['receitas_operacionais'].total[i];
      res['receita_liquida'].total[i]     = res['receita_bruta'].total[i] - res['deducoes'].total[i];
      res['margem_contribuicao'].total[i] = res['receita_liquida'].total[i] - res['custo_venda'].total[i];
      res['lucro_bruto'].total[i]         = res['margem_contribuicao'].total[i] - res['custos_operacionais'].total[i];
      res['ebitda'].total[i]              = res['lucro_bruto'].total[i] - res['despesas_adm'].total[i] - res['investimento_produto'].total[i];
      res['lair'].total[i]                = res['ebitda'].total[i] - res['depreciacao'].total[i] + res['resultado_financeiro'].total[i];
      res['lucro_liquido'].total[i]       = res['lair'].total[i] - res['ir_csll'].total[i];

      empresasList.forEach(emp => {
        const e = emp.id;
        res['receita_bruta'].porEmpresa[e][i]       = res['receitas_operacionais'].porEmpresa[e][i];
        res['receita_liquida'].porEmpresa[e][i]     = res['receita_bruta'].porEmpresa[e][i] - res['deducoes'].porEmpresa[e][i];
        res['margem_contribuicao'].porEmpresa[e][i] = res['receita_liquida'].porEmpresa[e][i] - res['custo_venda'].porEmpresa[e][i];
        res['lucro_bruto'].porEmpresa[e][i]         = res['margem_contribuicao'].porEmpresa[e][i] - res['custos_operacionais'].porEmpresa[e][i];
        res['ebitda'].porEmpresa[e][i]              = res['lucro_bruto'].porEmpresa[e][i] - res['despesas_adm'].porEmpresa[e][i] - res['investimento_produto'].porEmpresa[e][i];
        res['lair'].porEmpresa[e][i]                = res['ebitda'].porEmpresa[e][i] - res['depreciacao'].porEmpresa[e][i] + res['resultado_financeiro'].porEmpresa[e][i];
        res['lucro_liquido'].porEmpresa[e][i]       = res['lair'].porEmpresa[e][i] - res['ir_csll'].porEmpresa[e][i];
      });
    }

    return { res, drillCategoria };
  }, [dreData, empresaAtiva, planoContas]);

  const { res: dre, drillCategoria } = dreCalculada;
  const isConsolidado = empresaAtiva.id === 'consolidado';

  const handleOficializar = async () => {
    if (!versaoSelecionada) return alert("Selecione uma versão específica para oficializar");
    if (!confirm("Deseja oficializar esta versão como o orçamento final para este ano?")) return;
    try {
      const r = await fetch('/api/financeiro/fpa/dre', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versaoId: parseInt(versaoSelecionada), isFinal: true })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      alert("Orçamento oficializado com sucesso!");
      const vRes = await fetch(`/api/financeiro/fpa/dre?mode=versoes&ano=${anoAtivo}`);
      const vJson = await vRes.json();
      const lista = Array.isArray(vJson)
        ? vJson.filter(v => v.empresa_nome.toLowerCase() === empresaAtiva.id.toLowerCase())
        : [];
      setVersoes(lista);
    } catch (error) {
      alert("Erro ao oficializar: " + error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Seleção de Empresa */}
      <div className="flex items-center bg-black/20 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
        {EMPRESAS.map((emp) => (
          <EmpresaTab key={emp.id} nome={emp.nome} logo={emp.logo}
            isActive={empresaAtiva.id === emp.id}
            onClick={() => { setEmpresaAtiva(emp); setExpandedRows({}); }} />
        ))}
      </div>

      {/* Barra de Controles */}
      <div className="flex flex-wrap gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/10 shadow-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Ano</label>
          <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
            className="bg-[#0f1e3a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue cursor-pointer">
            {ANOS_DISPONIVEIS.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>

        {!isConsolidado && (
          <>
            <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
              <label className="text-[10px] text-white/40 uppercase font-bold">Versão do Orçamento</label>
              <select value={versaoSelecionada} onChange={(e) => setVersaoSelecionada(e.target.value)}
                className="bg-[#0f1e3a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue cursor-pointer w-full">
                <option value="">Versão mais recente</option>
                {versoes.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.is_final ? '⭐ ' : ''}{v.tipo} — {v.nome_identificador} ({new Date(v.created_at).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleOficializar} disabled={!versaoSelecionada}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg hover:scale-105 flex items-center gap-2">
              <span>⭐</span> OFICIALIZAR
            </button>
          </>
        )}

        {isConsolidado && (
          <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-500/20 rounded-lg px-4 py-2">
            <span className="text-blue-300 text-xs">
              Consolidado: exibe a versão mais recente de cada empresa. Expanda as linhas para ver a composição por empresa.
            </span>
          </div>
        )}
      </div>

      {/* Tabela DRE */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-white/30 text-sm">Carregando DRE...</div>
      ) : (
        <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-white/5 text-white/40 border-b border-white/10">
                  <th className="py-4 px-4 font-bold uppercase sticky left-0 bg-acelerar-dark-blue z-10 min-w-[280px] shadow-r text-xs">
                    Demonstrativo de Resultado (DRE)
                  </th>
                  {MESES.map(m => (
                    <th key={m} className="py-4 px-2 font-bold text-center min-w-[120px] border-l border-white/5">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ESTRUTURA_DRE.map((linha) => {
                  const receitaBruta = dre['receita_bruta'].total;
                  const podeExpandir = isConsolidado ? true : linha.tipo === 'grupo';
                  const isExpanded = !!expandedRows[linha.id];

                  return (
                    <React.Fragment key={linha.id}>
                      {/* Linha Principal */}
                      <tr
                        className={`border-b border-white/10 transition-colors ${podeExpandir ? 'cursor-pointer hover:bg-white/5' : ''} ${linha.bold ? 'bg-white/5' : ''}`}
                        onClick={() => podeExpandir && toggleRow(linha.id)}
                      >
                        <td className={`py-3 px-4 font-bold sticky left-0 bg-acelerar-dark-blue z-10 shadow-r flex items-center gap-2 ${linha.color}`}>
                          {podeExpandir && (
                            <span className={`text-[8px] transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          )}
                          {linha.nome}
                        </td>
                        {MESES.map((_, i) => {
                          const valor = dre[linha.id].total[i];
                          const pct = receitaBruta[i] > 0 ? (valor / receitaBruta[i]) * 100 : 0;
                          return (
                            <td key={i} className="py-3 px-2 text-right border-l border-white/5">
                              <div className="flex flex-col items-end">
                                <span className={`font-bold tabular-nums ${linha.color}`}>{fmt(valor)}</span>
                                {linha.id !== 'receita_bruta' && (
                                  <span className="text-[8px] text-white/30">{fmtPct(Math.abs(pct))}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Drill-down CONSOLIDADO: composição por empresa */}
                      {isConsolidado && isExpanded && EMPRESAS_INDIVIDUAIS.map(emp => {
                        const empVals = dre[linha.id].porEmpresa[emp.id] || zeros12();
                        const empReceita = dre['receita_bruta'].porEmpresa[emp.id] || zeros12();
                        return (
                          <tr key={emp.id} className="bg-black/40 border-b border-white/5">
                            <td className="py-2 px-10 text-white/40 text-[9px] italic sticky left-0 bg-acelerar-dark-blue z-10 shadow-r">
                              {emp.nome}
                            </td>
                            {MESES.map((_, i) => {
                              const v = empVals[i];
                              const p = empReceita[i] > 0 ? (v / empReceita[i]) * 100 : 0;
                              return (
                                <td key={i} className="py-2 px-2 text-right border-l border-white/5 text-white/50 text-[9px]">
                                  <div className="flex flex-col items-end">
                                    <span className="tabular-nums">{fmt(v)}</span>
                                    {linha.id !== 'receita_bruta' && (
                                      <span className="text-[7px] opacity-50">{fmtPct(Math.abs(p))}</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Drill-down EMPRESA INDIVIDUAL: composição por categoria */}
                      {!isConsolidado && isExpanded && linha.tipo === 'grupo' && (
                        Object.keys(drillCategoria[linha.id] || {}).length === 0 ? (
                          <tr className="bg-black/40 border-b border-white/5">
                            <td colSpan={13} className="py-2 px-10 text-white/20 text-[9px] italic">
                              Nenhuma categoria encontrada para esta linha.
                            </td>
                          </tr>
                        ) : (
                          Object.entries(drillCategoria[linha.id]).map(([catKey, catData]) => (
                            <tr key={catKey} className="bg-black/40 border-b border-white/5">
                              <td className="py-2 px-10 text-white/40 text-[9px] italic sticky left-0 bg-acelerar-dark-blue z-10 shadow-r">
                                {catData.descricao}
                              </td>
                              {MESES.map((_, i) => (
                                <td key={i} className="py-2 px-2 text-right border-l border-white/5 text-white/50 text-[9px] tabular-nums">
                                  {fmt(catData.valores[i])}
                                </td>
                              ))}
                            </tr>
                          ))
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-white/5 p-4 text-white/30 text-[10px] italic">
            * % calculado sobre a Receita Bruta do mês. Expanda as linhas para ver a composição por {isConsolidado ? 'empresa' : 'categoria'}.
          </div>
        </div>
      )}
    </div>
  );
}
