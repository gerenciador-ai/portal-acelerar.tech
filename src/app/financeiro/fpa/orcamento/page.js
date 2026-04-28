"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import * as XLSX from 'xlsx';

const EMPRESAS = [
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

const LINHAS_DRE_MESTRAS = [
  "RECEITAS OPERACIONAIS",
  "(-) DEDUÇÕES E IMPOSTOS",
  "(-) PESSOAL COMERCIAL",
  "(-) FERRAMENTAS E MKT COMERCIAL",
  "(-) PESSOAL OPERACIONAL",
  "(-) INFRA E SOFTWARES OPERACIONAIS",
  "(-) PESSOAL ADMINISTRATIVO",
  "(-) INFRA E GESTÃO ADMINISTRATIVA",
  "(-) INVESTIMENTO EM PRODUTO",
  "(-) DEPRECIAÇÃO E AMORTIZAÇÃO",
  "(+/-) RESULTADO FINANCEIRO",
  "OUTROS / NÃO CLASSIFICADOS"
];

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

// Gera os próximos 5 anos a partir do ano atual, dinamicamente
const anoAtualGlobal = new Date().getFullYear();
const ANOS_DISPONIVEIS = [0, 1, 2, 3, 4].map(i => anoAtualGlobal + i);

// Converte valor string brasileiro (ex: "1.500,00") para float
function parseBRL(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const str = String(valor).trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(str) || 0;
}

// Extrai o índice do mês (0-11) a partir de uma data no formato YYYY-MM-DD ou DDMMAAAA
function extrairMesIdx(dataStr) {
  const s = String(dataStr).trim();
  if (/^\d{4}-\d{2}/.test(s)) {
    return parseInt(s.substring(5, 7), 10) - 1;
  }
  if (/^\d{8}$/.test(s)) {
    return parseInt(s.substring(2, 4), 10) - 1;
  }
  return -1;
}

function EmpresaTab({ nome, logo, isActive, onClick }) {
  const isVMC = nome === 'VMC Tech';
  const containerWidth = isVMC ? 'w-40' : 'w-28';
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center h-20 ${containerWidth} transition-all duration-200 border-b-2 ${
        isActive ? 'border-acelerar-light-blue bg-white/5' : 'border-transparent hover:bg-white/5'
      }`}
    >
      {logo && (
        <div className="relative w-full h-full p-3">
          <Image
            src={logo} alt={nome} fill
            className={`transition-opacity duration-200 object-contain p-2 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      )}
    </button>
  );
}

export default function OrcamentoPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [anoAtivo, setAnoAtivo] = useState(anoAtualGlobal);
  const [tipoVersao, setTipoVersao] = useState('BUDGET');
  const [nomeVersao, setNomeVersao] = useState('');
  const [loading, setLoading] = useState(false);
  const [planoContas, setPlanoContas] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [grid, setGrid] = useState({});
  const [importando, setImportando] = useState(false);
  const [alertasImport, setAlertasImport] = useState([]);
  const [premissas, setPremissas] = useState(null);
  const fileInputRef = useRef(null);

  // Carrega o plano de contas uma única vez
  useEffect(() => {
    const fetchPlano = async () => {
      try {
        const res = await fetch('/api/financeiro/fpa/orcamento?mode=plano');
        const data = await res.json();
        setPlanoContas(data);
        const initialGrid = {};
        data.forEach(cat => {
          const key = cat.codigo_9_digitos || cat.categoria_nibo;
          initialGrid[key] = Array(12).fill(0);
        });
        setGrid(initialGrid);
      } catch (error) {
        console.error("Erro ao carregar plano de contas:", error);
      }
    };
    fetchPlano();
  }, []);

  // Carrega as premissas ao trocar empresa ou ano
  useEffect(() => {
    if (!empresaAtiva) return;
    const fetchPremissas = async () => {
      try {
        const res = await fetch(`/api/financeiro/fpa/premissas?empresa=${empresaAtiva.id}&ano=${anoAtivo}`);
        const data = await res.json();
        setPremissas(data || null);
      } catch {
        setPremissas(null);
      }
    };
    fetchPremissas();
  }, [empresaAtiva, anoAtivo]);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const updateCell = (key, mesIdx, valor) => {
    setGrid(prev => ({
      ...prev,
      [key]: prev[key].map((v, i) => i === mesIdx ? (parseFloat(valor) || 0) : v)
    }));
  };

  const propagarValor = (key, mesIdx) => {
    const valorParaCopiar = grid[key][mesIdx];
    setGrid(prev => ({
      ...prev,
      [key]: prev[key].map((v, i) => i > mesIdx ? valorParaCopiar : v)
    }));
  };

  // ─── IMPORTAÇÃO DE XLSX ───────────────────────────────────────────────────
  const handleImportarXLSX = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    setAlertasImport([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const planoIndex = {};
        planoContas.forEach(cat => {
          const key = cat.codigo_9_digitos || cat.categoria_nibo;
          if (cat.codigo_9_digitos) planoIndex[cat.codigo_9_digitos.trim()] = key;
          if (cat.categoria_nibo) planoIndex[cat.categoria_nibo.trim().toLowerCase()] = key;
        });

        const novoGrid = {};
        planoContas.forEach(cat => {
          const key = cat.codigo_9_digitos || cat.categoria_nibo;
          novoGrid[key] = Array(12).fill(0);
        });

        const naoEncontradas = new Set();

        rows.forEach((row, idx) => {
          const dataRaw = row['DATA DE COMPETÊNCIA'] || row['DATA DE COMPETENCIA'] || row['data'] || '';
          const catRaw = String(row['CATEGORIA'] || row['categoria'] || '').trim();
          const valorRaw = row['VALOR'] || row['valor'] || 0;

          if (!dataRaw || !catRaw) return;

          const mesIdx = extrairMesIdx(dataRaw);
          if (mesIdx < 0 || mesIdx > 11) {
            naoEncontradas.add(`Linha ${idx + 2}: data inválida "${dataRaw}"`);
            return;
          }

          const valor = parseBRL(valorRaw);
          const chave = planoIndex[catRaw] || planoIndex[catRaw.toLowerCase()] || null;

          if (!chave) {
            naoEncontradas.add(`Categoria não encontrada: "${catRaw}"`);
            return;
          }

          if (!novoGrid[chave]) novoGrid[chave] = Array(12).fill(0);
          novoGrid[chave][mesIdx] += valor;
        });

        setGrid(prev => {
          const merged = { ...prev };
          Object.keys(novoGrid).forEach(k => { merged[k] = novoGrid[k]; });
          return merged;
        });

        if (naoEncontradas.size > 0) setAlertasImport([...naoEncontradas]);

      } catch (err) {
        alert("Erro ao processar o arquivo: " + err.message);
      } finally {
        setImportando(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const categoriasPorGrupo = useMemo(() => {
    const map = {};
    LINHAS_DRE_MESTRAS.forEach(grupo => {
      map[grupo] = planoContas.filter(cat => cat.grupo_dre === grupo);
    });
    return map;
  }, [planoContas]);

  const totaisGrupo = useMemo(() => {
    const totais = {};
    LINHAS_DRE_MESTRAS.forEach(grupo => {
      totais[grupo] = Array(12).fill(0);
      const categorias = categoriasPorGrupo[grupo] || [];
      categorias.forEach(cat => {
        const key = cat.codigo_9_digitos || cat.categoria_nibo;
        const valores = grid[key] || Array(12).fill(0);
        valores.forEach((v, i) => { totais[grupo][i] += v; });
      });
    });
    return totais;
  }, [grid, categoriasPorGrupo]);

  // ─── LINHAS CALCULADAS PELAS PREMISSAS ───────────────────────────────────

  // PROJEÇÃO DE CRESCIMENTO — calculada primeiro pois compõe a Receita Bruta Total
  // Se PERCENTUAL: Receitas Operacionais cadastradas × %
  // Se VALOR_FIXO: valor fixo a partir do mês de início
  const linhaCrescimento = useMemo(() => {
    if (!premissas) return Array(12).fill(0);
    const tipo = premissas.crescimento_tipo || 'PERCENTUAL';
    const valor = parseFloat(premissas.crescimento_valor) || 0;
    const mesInicio = parseInt(premissas.crescimento_mes_inicio) || 1;
    return Array(12).fill(0).map((_, i) => {
      if (i < mesInicio - 1) return 0;
      if (tipo === 'VALOR_FIXO') return valor;
      const receitaCadastrada = (totaisGrupo["RECEITAS OPERACIONAIS"] || Array(12).fill(0))[i];
      return receitaCadastrada * (valor / 100);
    });
  }, [premissas, totaisGrupo]);

  // RECEITA BRUTA TOTAL = Receitas Operacionais cadastradas + Projeção de Crescimento
  // Esta é a base de cálculo correta para impostos e deduções
  const receitaBrutaTotal = useMemo(() => {
    return (totaisGrupo["RECEITAS OPERACIONAIS"] || Array(12).fill(0)).map((v, i) => v + linhaCrescimento[i]);
  }, [totaisGrupo, linhaCrescimento]);

  // (-) IR / CSLL Projetado = Receita Bruta Total × Imposto Médio (%)
  // Base: Receitas Operacionais + Crescimento Projetado, respeitando mês de início
  const linhaIRCSLL = useMemo(() => {
    if (!premissas) return Array(12).fill(0);
    const pct = parseFloat(premissas.imposto_medio_percentual) / 100 || 0;
    const mesInicio = parseInt(premissas.imposto_medio_mes_inicio) || 1;
    return receitaBrutaTotal.map((v, i) => i >= mesInicio - 1 ? v * pct : 0);
  }, [premissas, receitaBrutaTotal]);

  // ─────────────────────────────────────────────────────────────────────────

  const handleSalvar = async () => {
    if (!empresaAtiva) return alert("Selecione uma empresa");
    if (!nomeVersao) return alert("Dê um nome para esta versão do orçamento");
    setLoading(true);
    try {
      const res = await fetch('/api/financeiro/fpa/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: empresaAtiva.nome,
          ano: anoAtivo,
          tipo: tipoVersao,
          nome: nomeVersao,
          dados: grid
        })
      });
      if (res.ok) {
        alert("Orçamento salvo com sucesso para " + empresaAtiva.nome);
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      alert("Erro ao salvar orçamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = "bg-[#0f1e3a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue cursor-pointer";

  return (
    <div className="flex flex-col gap-6">
      {/* Seleção de Empresa */}
      <div className="flex items-center bg-black/20 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
        {EMPRESAS.map((emp) => (
          <EmpresaTab key={emp.id} nome={emp.nome} logo={emp.logo}
            isActive={empresaAtiva?.id === emp.id} onClick={() => setEmpresaAtiva(emp)} />
        ))}
      </div>

      {/* Barra de Controles */}
      <div className="flex flex-wrap gap-4 items-center bg-black/20 p-4 rounded-xl border border-white/10 shadow-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Ano</label>
          <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))} className={selectStyle}>
            {ANOS_DISPONIVEIS.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Tipo</label>
          <select value={tipoVersao} onChange={(e) => setTipoVersao(e.target.value)} className={selectStyle}>
            <option value="BUDGET">BUDGET (Orçamento)</option>
            <option value="FORECAST">FORECAST (Revisão)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[10px] text-white/40 uppercase font-bold">Nome da Versão</label>
          <input
            type="text"
            placeholder="Ex: Planejamento Inicial 2026"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue transition-all"
            value={nomeVersao}
            onChange={(e) => setNomeVersao(e.target.value)}
          />
        </div>

        {/* Botão Importar XLSX */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Importar Dados</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importando || planoContas.length === 0}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg hover:scale-105 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {importando ? 'PROCESSANDO...' : 'IMPORTAR XLSX'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportarXLSX} />
        </div>

        <button
          onClick={handleSalvar}
          disabled={loading || !empresaAtiva}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg text-sm font-bold transition-all shadow-lg hover:scale-105 mt-4 sm:mt-0"
        >
          {loading ? 'SALVANDO...' : 'SALVAR ORÇAMENTO'}
        </button>
      </div>

      {/* Alertas de Importação */}
      {alertasImport.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-xl p-4">
          <p className="text-yellow-400 text-xs font-bold mb-2">⚠️ Atenção — Itens não reconhecidos na importação ({alertasImport.length}):</p>
          <ul className="text-yellow-300/70 text-[10px] space-y-1 max-h-32 overflow-y-auto">
            {alertasImport.map((a, i) => <li key={i}>• {a}</li>)}
          </ul>
          <p className="text-yellow-300/50 text-[9px] mt-2 italic">Os demais itens foram importados normalmente. Revise os itens acima e ajuste manualmente se necessário.</p>
        </div>
      )}

      {/* Aviso de premissas não configuradas */}
      {empresaAtiva && !premissas && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
          <p className="text-blue-300 text-xs">
            ℹ️ Nenhuma premissa configurada para {empresaAtiva.nome} em {anoAtivo}. As linhas calculadas (IR/CSLL e Crescimento) aparecerão zeradas. Configure as premissas na tela de <strong>Premissas</strong>.
          </p>
        </div>
      )}

      {!empresaAtiva ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-black/10 rounded-2xl border border-dashed border-white/10">
          <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-xl font-medium">Selecione uma empresa acima para iniciar o orçamento</p>
        </div>
      ) : (
        <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-white/5 text-white/40 border-b border-white/10">
                  <th className="py-4 px-4 font-bold uppercase sticky left-0 bg-acelerar-dark-blue z-10 min-w-[300px] shadow-r text-xs">Estrutura DRE / Orçamento</th>
                  {MESES.map(m => (
                    <th key={m} className="py-4 px-2 font-bold text-center min-w-[100px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Linhas Mestras com Drill-down */}
                {LINHAS_DRE_MESTRAS.map((grupo) => (
                  <React.Fragment key={grupo}>
                    <tr className="bg-white/5 border-b border-white/10 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toggleGroup(grupo)}>
                      <td className="py-3 px-4 font-bold text-acelerar-light-blue sticky left-0 bg-acelerar-dark-blue z-10 shadow-r flex items-center gap-2">
                        <span className={`transition-transform duration-200 ${expandedGroups[grupo] ? 'rotate-90' : ''}`}>▶</span>
                        {grupo}
                      </td>
                      {MESES.map((m, idx) => (
                        <td key={m} className="py-3 px-2 text-right font-bold text-white/90">
                          {totaisGrupo[grupo][idx].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                    </tr>

                    {expandedGroups[grupo] && (categoriasPorGrupo[grupo] || []).map((cat) => {
                      const key = cat.codigo_9_digitos || cat.categoria_nibo;
                      return (
                        <tr key={key} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="py-2 px-8 font-medium text-white/60 sticky left-0 bg-acelerar-dark-blue group-hover:bg-white/5 z-10 shadow-r italic">
                            {cat.descricao_orcamento}
                            <span className="block text-[8px] text-white/20 font-normal">{key}</span>
                          </td>
                          {MESES.map((m, idx) => (
                            <td key={m} className="py-1 px-1">
                              <div className="relative flex items-center group/cell">
                                <input
                                  type="number"
                                  className="w-full bg-white/5 border border-white/10 rounded p-1.5 text-right text-white outline-none focus:border-acelerar-light-blue transition-all text-[10px]"
                                  value={grid[key]?.[idx] || 0}
                                  onChange={(e) => updateCell(key, idx, e.target.value)}
                                />
                                {idx < 11 && (
                                  <button
                                    onClick={() => propagarValor(key, idx)}
                                    title="Propagar para os meses seguintes"
                                    className="absolute -right-1 opacity-0 group-hover/cell:opacity-100 bg-acelerar-light-blue text-white rounded-full p-1 shadow-lg hover:scale-110 transition-all z-20"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* ─── LINHA CALCULADA: (-) IR / CSLL PROJETADO ─── */}
                <tr className="bg-red-900/20 border-b border-red-500/20">
                  <td className="py-3 px-4 font-bold text-red-300 sticky left-0 bg-acelerar-dark-blue z-10 shadow-r flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                    (-) IR / CSLL PROJETADO
                    <span className="text-[9px] text-white/20 font-normal ml-1">
                      {premissas ? `${premissas.imposto_medio_percentual}% s/ Rec. Bruta` : 'sem premissa'}
                    </span>
                  </td>
                  {MESES.map((m, idx) => (
                    <td key={m} className="py-3 px-2 text-right font-bold text-red-300/80">
                      {linhaIRCSLL[idx].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>

                {/* ─── LINHA CALCULADA: PROJEÇÃO DE CRESCIMENTO ─── */}
                <tr className="bg-green-900/20 border-b border-green-500/20">
                  <td className="py-3 px-4 font-bold text-green-300 sticky left-0 bg-acelerar-dark-blue z-10 shadow-r flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                    PROJEÇÃO DE CRESCIMENTO
                    <span className="text-[9px] text-white/20 font-normal ml-1">
                      {premissas
                        ? premissas.crescimento_tipo === 'PERCENTUAL'
                          ? `${premissas.crescimento_valor}% s/ Rec. Op.`
                          : `Valor fixo R$ ${parseFloat(premissas.crescimento_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'sem premissa'}
                    </span>
                  </td>
                  {MESES.map((m, idx) => (
                    <td key={m} className="py-3 px-2 text-right font-bold text-green-300/80">
                      {linhaCrescimento[idx].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
          <div className="bg-white/5 p-4 text-white/30 text-[10px] italic">
            * Expanda as linhas mestras para detalhar o orçamento por categoria. As linhas em vermelho e verde são calculadas automaticamente pelas premissas configuradas.
          </div>
        </div>
      )}
    </div>
  );
}
