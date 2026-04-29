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

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const anoAtualGlobal = new Date().getFullYear();
const ANOS_DISPONIVEIS = [0, 1, 2, 3, 4].map(i => anoAtualGlobal + i);

// ─── ESTRUTURA DA DRE (ORDEM DE CÁLCULO) ─────────────────────────────────────
const ESTRUTURA_DRE = [
  { id: 'receita_bruta', nome: '(=) RECEITA BRUTA', tipo: 'resultado', color: 'text-white' },
  { id: 'deducoes', nome: '(-) DEDUÇÕES E IMPOSTOS', tipo: 'grupo', color: 'text-white/60', grupos: ['(-) DEDUÇÕES E IMPOSTOS'] },
  { id: 'receita_liquida', nome: '(=) RECEITA LÍQUIDA', tipo: 'resultado', color: 'text-white/90' },
  { id: 'custo_venda', nome: '(-) CUSTO DE VENDA (CAC)', tipo: 'grupo', color: 'text-orange-400/80', grupos: ['(-) PESSOAL COMERCIAL', '(-) FERRAMENTAS E MKT COMERCIAL'] },
  { id: 'margem_contribuicao', nome: '(=) MARGEM DE CONTRIBUIÇÃO', tipo: 'resultado', color: 'text-acelerar-light-blue', bold: true },
  { id: 'custos_operacionais', nome: '(-) CUSTOS OPERACIONAIS', tipo: 'grupo', color: 'text-white/60', grupos: ['(-) PESSOAL OPERACIONAL', '(-) INFRA E SOFTWARES OPERACIONAIS'] },
  { id: 'lucro_bruto', nome: '(=) LUCRO BRUTO', tipo: 'resultado', color: 'text-white/90' },
  { id: 'despesas_adm', nome: '(-) DESPESAS ADMINISTRATIVAS', tipo: 'grupo', color: 'text-white/60', grupos: ['(-) PESSOAL ADMINISTRATIVO', '(-) INFRA E GESTÃO ADMINISTRATIVA'] },
  { id: 'investimento_produto', nome: '(-) INVESTIMENTO EM PRODUTO', tipo: 'grupo', color: 'text-white/60', grupos: ['(-) INVESTIMENTO EM PRODUTO'] },
  { id: 'ebitda', nome: '(=) EBITDA', tipo: 'resultado', color: 'text-green-400', bold: true },
  { id: 'depreciacao', nome: '(-) DEPRECIAÇÃO E AMORTIZAÇÃO', tipo: 'grupo', color: 'text-white/40', grupos: ['(-) DEPRECIAÇÃO E AMORTIZAÇÃO'] },
  { id: 'resultado_financeiro', nome: '(+/-) RESULTADO FINANCEIRO', tipo: 'grupo', color: 'text-white/40', grupos: ['(+/-) RESULTADO FINANCEIRO'] },
  { id: 'lair', nome: '(=) LUCRO ANTES DO IR/CSLL', tipo: 'resultado', color: 'text-white/90' },
  { id: 'ir_csll', nome: '(-) IR / CSLL PROJETADO', tipo: 'calculado', color: 'text-red-400/80' },
  { id: 'lucro_liquido', nome: '(=) LUCRO LÍQUIDO FINAL', tipo: 'resultado', color: 'text-green-500', bold: true }
];

const formatarMoeda = (valor) => {
  const num = parseFloat(valor) || 0;
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(num);
};

const formatarPct = (valor) => {
  const num = parseFloat(valor) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
};

function EmpresaTab({ nome, logo, isActive, onClick }) {
  const isVMC = nome === 'VMC Tech';
  const containerWidth = isVMC ? 'w-40' : 'w-28';
  return (
    <button onClick={onClick} className={`relative flex items-center justify-center h-20 ${containerWidth} transition-all duration-200 border-b-2 ${isActive ? 'border-acelerar-light-blue bg-white/5' : 'border-transparent hover:bg-white/5'}`}>
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ orcamento: [], premissas: [] });
  const [expandedRows, setExpandedRows] = useState({});
  const [versoes, setVersoes] = useState([]);
  const [versaoSelecionada, setVersaoSelecionada] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/financeiro/fpa/dre?empresa=${empresaAtiva.id}&ano=${anoAtivo}${versaoSelecionada ? `&versaoId=${versaoSelecionada}` : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        setData(json);

        // Busca versões para o seletor
        const vRes = await fetch(`/api/financeiro/fpa/orcamento?empresa=${empresaAtiva.id}&ano=${anoAtivo}`);
        const vJson = await vRes.json();
        setVersoes(vJson || []);
      } catch (error) {
        console.error("Erro ao carregar DRE:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [empresaAtiva, anoAtivo, versaoSelecionada]);

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── CÁLCULOS DA DRE ───────────────────────────────────────────────────────
  const dreCalculada = useMemo(() => {
    const results = {};
    const empresasList = empresaAtiva.id === 'consolidado' ? EMPRESAS.filter(e => e.id !== 'consolidado') : [empresaAtiva];
    
    ESTRUTURA_DRE.forEach(linha => {
      results[linha.id] = { total: Array(12).fill(0), porEmpresa: {} };
      empresasList.forEach(emp => {
        results[linha.id].porEmpresa[emp.id] = Array(12).fill(0);
      });
    });

    // 1. Processa Orçamento Base (Grupos DRE)
    data.orcamento.forEach(item => {
      const mesIdx = item.mes - 1;
      const valor = parseFloat(item.valor_base) || 0;
      const empId = item.empresa_nome.toLowerCase();
      
      ESTRUTURA_DRE.filter(l => l.tipo === 'grupo').forEach(linha => {
        if (linha.grupos.includes(item.grupo_dre)) {
          if (results[linha.id].porEmpresa[empId]) {
            results[linha.id].porEmpresa[empId][mesIdx] += valor;
            results[linha.id].total[mesIdx] += valor;
          }
        }
      });

      // Receita Bruta (Base)
      if (item.grupo_dre === 'RECEITAS OPERACIONAIS') {
        if (results['receita_bruta'].porEmpresa[empId]) {
          results['receita_bruta'].porEmpresa[empId][mesIdx] += valor;
          results['receita_bruta'].total[mesIdx] += valor;
        }
      }
    });

    // 2. Aplica Premissas (Crescimento e IR/CSLL)
    empresasList.forEach(emp => {
      const premissa = data.premissas.find(p => p.empresa === emp.id);
      if (premissa) {
        for (let i = 0; i < 12; i++) {
          // Crescimento
          let cresc = 0;
          if (i >= (premissa.crescimento_mes_inicio - 1)) {
            if (premissa.crescimento_tipo === 'VALOR_FIXO') cresc = parseFloat(premissa.crescimento_valor) || 0;
            else cresc = results['receita_bruta'].porEmpresa[emp.id][i] * (parseFloat(premissa.crescimento_valor) / 100 || 0);
          }
          results['receita_bruta'].porEmpresa[emp.id][i] += cresc;
          results['receita_bruta'].total[i] += cresc;

          // IR/CSLL (calculado depois da Receita Bruta Total)
          if (i >= (premissa.imposto_medio_mes_inicio - 1)) {
            const imp = results['receita_bruta'].porEmpresa[emp.id][i] * (parseFloat(premissa.imposto_medio_percentual) / 100 || 0);
            results['ir_csll'].porEmpresa[emp.id][i] += imp;
            results['ir_csll'].total[i] += imp;
          }
        }
      }
    });

    // 3. Cálculos de Resultados Intermediários
    for (let i = 0; i < 12; i++) {
      // Receita Líquida
      results['receita_liquida'].total[i] = results['receita_bruta'].total[i] - results['deducoes'].total[i];
      // Margem de Contribuição
      results['margem_contribuicao'].total[i] = results['receita_liquida'].total[i] - results['custo_venda'].total[i];
      // Lucro Bruto
      results['lucro_bruto'].total[i] = results['margem_contribuicao'].total[i] - results['custos_operacionais'].total[i];
      // EBITDA
      results['ebitda'].total[i] = results['lucro_bruto'].total[i] - results['despesas_adm'].total[i] - results['investimento_produto'].total[i];
      // LAIR
      results['lair'].total[i] = results['ebitda'].total[i] - results['depreciacao'].total[i] + results['resultado_financeiro'].total[i];
      // Lucro Líquido
      results['lucro_liquido'].total[i] = results['lair'].total[i] - results['ir_csll'].total[i];

      // Repete para cada empresa (para o drill-down do consolidado)
      empresasList.forEach(emp => {
        results['receita_liquida'].porEmpresa[emp.id][i] = results['receita_bruta'].porEmpresa[emp.id][i] - results['deducoes'].porEmpresa[emp.id][i];
        results['margem_contribuicao'].porEmpresa[emp.id][i] = results['receita_liquida'].porEmpresa[emp.id][i] - results['custo_venda'].porEmpresa[emp.id][i];
        results['lucro_bruto'].porEmpresa[emp.id][i] = results['margem_contribuicao'].porEmpresa[emp.id][i] - results['custos_operacionais'].porEmpresa[emp.id][i];
        results['ebitda'].porEmpresa[emp.id][i] = results['lucro_bruto'].porEmpresa[emp.id][i] - results['despesas_adm'].porEmpresa[emp.id][i] - results['investimento_produto'].porEmpresa[emp.id][i];
        results['lair'].porEmpresa[emp.id][i] = results['ebitda'].porEmpresa[emp.id][i] - results['depreciacao'].porEmpresa[emp.id][i] + results['resultado_financeiro'].porEmpresa[emp.id][i];
        results['lucro_liquido'].porEmpresa[emp.id][i] = results['lair'].porEmpresa[emp.id][i] - results['ir_csll'].porEmpresa[emp.id][i];
      });
    }

    return results;
  }, [data, empresaAtiva]);

  const handleOficializar = async () => {
    if (!versaoSelecionada) return alert("Selecione uma versão para oficializar");
    if (!confirm("Deseja oficializar esta versão como o orçamento final para este ano?")) return;
    try {
      const res = await fetch('/api/financeiro/fpa/dre', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versaoId: versaoSelecionada, isFinal: true })
      });
      if (res.ok) alert("Orçamento oficializado com sucesso!");
    } catch (error) {
      alert("Erro ao oficializar: " + error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Seleção de Empresa */}
      <div className="flex items-center bg-black/20 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
        {EMPRESAS.map((emp) => (
          <EmpresaTab key={emp.id} nome={emp.nome} logo={emp.logo} isActive={empresaAtiva.id === emp.id} onClick={() => { setEmpresaAtiva(emp); setVersaoSelecionada(null); }} />
        ))}
      </div>

      {/* Barra de Controles */}
      <div className="flex flex-wrap gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/10 shadow-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Ano</label>
          <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))} className="bg-[#0f1e3a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue cursor-pointer">
            {ANOS_DISPONIVEIS.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[250px]">
          <label className="text-[10px] text-white/40 uppercase font-bold">Versão do Orçamento</label>
          <select value={versaoSelecionada || ''} onChange={(e) => setVersaoSelecionada(e.target.value)} className="bg-[#0f1e3a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue cursor-pointer w-full">
            <option value="">Versão mais recente (ou Final)</option>
            {versoes.map(v => (
              <option key={v.id} value={v.id}>
                {v.is_final ? '⭐ ' : ''}{v.tipo} - {v.nome_identificador} ({new Date(v.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleOficializar} disabled={!versaoSelecionada} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg hover:scale-105 flex items-center gap-2">
          <span className="text-lg">⭐</span> OFICIALIZAR ORÇAMENTO
        </button>
      </div>

      {/* Tabela DRE */}
      <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-white/5 text-white/40 border-b border-white/10">
                <th className="py-4 px-4 font-bold uppercase sticky left-0 bg-acelerar-dark-blue z-10 min-w-[280px] shadow-r text-xs">Demonstrativo de Resultado (DRE)</th>
                {MESES.map(m => (
                  <th key={m} className="py-4 px-2 font-bold text-center min-w-[130px] border-l border-white/5">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ESTRUTURA_DRE.map((linha) => {
                const totalReceita = dreCalculada['receita_bruta'].total;
                return (
                  <React.Fragment key={linha.id}>
                    <tr className={`border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${linha.bold ? 'bg-white/5' : ''}`} onClick={() => toggleRow(linha.id)}>
                      <td className={`py-3 px-4 font-bold sticky left-0 bg-acelerar-dark-blue z-10 shadow-r flex items-center gap-2 ${linha.color}`}>
                        {empresaAtiva.id === 'consolidado' && <span className={`text-[8px] transition-transform ${expandedRows[linha.id] ? 'rotate-90' : ''}`}>▶</span>}
                        {linha.nome}
                      </td>
                      {MESES.map((_, i) => {
                        const valor = dreCalculada[linha.id].total[i];
                        const pct = totalReceita[i] > 0 ? (valor / totalReceita[i]) * 100 : 0;
                        return (
                          <td key={i} className="py-3 px-2 text-right border-l border-white/5">
                            <div className="flex flex-col">
                              <span className={`font-bold tabular-nums ${linha.color}`}>{formatarMoeda(valor)}</span>
                              {linha.id !== 'receita_bruta' && (
                                <span className="text-[8px] text-white/30 font-medium">{formatarPct(Math.abs(pct))}</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Drill-down por Empresa (Apenas no Consolidado) */}
                    {empresaAtiva.id === 'consolidado' && expandedRows[linha.id] && EMPRESAS.filter(e => e.id !== 'consolidado').map(emp => {
                      const valorEmp = dreCalculada[linha.id].porEmpresa[emp.id]?.[i] || 0;
                      // Nota: i não está definido aqui no map de empresas, precisamos do map de meses interno
                      return (
                        <tr key={emp.id} className="bg-black/40 border-b border-white/5 text-[9px] italic">
                          <td className="py-2 px-8 text-white/40 sticky left-0 bg-acelerar-dark-blue z-10 shadow-r">{emp.nome}</td>
                          {MESES.map((_, i) => {
                            const v = dreCalculada[linha.id].porEmpresa[emp.id][i];
                            const p = dreCalculada['receita_bruta'].porEmpresa[emp.id][i] > 0 ? (v / dreCalculada['receita_bruta'].porEmpresa[emp.id][i]) * 100 : 0;
                            return (
                              <td key={i} className="py-2 px-2 text-right border-l border-white/5 text-white/50">
                                <div className="flex flex-col">
                                  <span className="tabular-nums">{formatarMoeda(v)}</span>
                                  {linha.id !== 'receita_bruta' && <span className="text-[7px] opacity-50">{formatarPct(Math.abs(p))}</span>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white/5 p-4 rounded-xl text-white/30 text-[10px] italic">
        * A Análise Vertical (%) é calculada sobre a Receita Bruta de cada mês. No modo Consolidado, expanda as linhas para ver a composição por empresa.
      </div>
    </div>
  );
}
