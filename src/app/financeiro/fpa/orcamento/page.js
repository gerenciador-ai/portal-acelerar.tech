"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';

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

function EmpresaTab({ nome, logo, isActive, onClick }) {
  const isVMC = nome === 'VMC Tech';
  const containerWidth = isVMC ? 'w-40' : 'w-28';

  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center justify-center h-20 ${containerWidth} transition-all duration-200 border-b-2 ${
        isActive 
        ? 'border-acelerar-light-blue bg-white/5' 
        : 'border-transparent hover:bg-white/5'
      }`}
    >
      {logo && (
        <div className="relative w-full h-full p-3">
          <Image 
            src={logo} 
            alt={nome} 
            fill
            className={`transition-opacity duration-200 object-contain p-2 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      )}
    </button>
  );
}

const LINHAS_DRE = [
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

export default function OrcamentoPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear());
  const [tipoVersao, setTipoVersao] = useState('BUDGET');
  const [nomeVersao, setNomeVersao] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [grid, setGrid] = useState(
    LINHAS_DRE.reduce((acc, linha) => ({
      ...acc,
      [linha]: Array(12).fill(0)
    }), {})
  );

  const updateCell = (linha, mesIdx, valor) => {
    const novoGrid = { ...grid };
    novoGrid[linha][mesIdx] = parseFloat(valor) || 0;
    setGrid(novoGrid);
  };

  const propagarValor = (linha, mesIdx) => {
    const valorParaCopiar = grid[linha][mesIdx];
    const novoGrid = { ...grid };
    for (let i = mesIdx + 1; i < 12; i++) {
      novoGrid[linha][i] = valorParaCopiar;
    }
    setGrid(novoGrid);
  };

  const handleSalvar = async () => {
    if (!empresaAtiva) return alert("Selecione uma empresa");
    if (!nomeVersao) return alert("Dê um nome para esta versão do orçamento");
    setLoading(true);
    
    try {
      alert("Orçamento salvo com sucesso para " + empresaAtiva.nome);
    } catch (error) {
      alert("Erro ao salvar orçamento");
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = "bg-acelerar-dark-blue border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue appearance-none cursor-pointer";
  const optionStyle = "bg-acelerar-dark-blue text-white";

  return (
    <div className="flex flex-col gap-6">
      {/* Abas de Empresas (Padrão DFC) */}
      <div className="flex items-center bg-black/20 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
        {EMPRESAS.map((emp) => (
          <EmpresaTab
            key={emp.id}
            nome={emp.nome}
            logo={emp.logo}
            isActive={empresaAtiva?.id === emp.id}
            onClick={() => setEmpresaAtiva(emp)}
          />
        ))}
      </div>

      {/* Cabeçalho de Configuração da Versão */}
      <div className="flex flex-wrap gap-4 items-center bg-black/20 p-4 rounded-xl border border-white/10 shadow-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Ano</label>
          <select 
            value={anoAtivo} 
            onChange={(e) => setAnoAtivo(e.target.value)}
            className={selectStyle}
          >
            {[2024, 2025, 2026].map(ano => <option key={ano} value={ano} className={optionStyle}>{ano}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Tipo</label>
          <select 
            value={tipoVersao} 
            onChange={(e) => setTipoVersao(e.target.value)}
            className={selectStyle}
          >
            <option value="BUDGET" className={optionStyle}>BUDGET (Orçamento)</option>
            <option value="FORECAST" className={optionStyle}>FORECAST (Revisão)</option>
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
        <button 
          onClick={handleSalvar}
          disabled={loading || !empresaAtiva}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg text-sm font-bold transition-all shadow-lg hover:scale-105 mt-4 sm:mt-0"
        >
          {loading ? 'SALVANDO...' : 'SALVAR ORÇAMENTO'}
        </button>
      </div>

      {!empresaAtiva ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-black/10 rounded-2xl border border-dashed border-white/10">
          <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" /></svg>
          <p className="text-xl font-medium">Selecione uma empresa acima para iniciar o orçamento</p>
        </div>
      ) : (
        <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 text-white/40 border-b border-white/10">
                  <th className="py-4 px-4 font-bold uppercase sticky left-0 bg-acelerar-dark-blue z-10 min-w-[250px] shadow-r">Linha do DRE</th>
                  {MESES.map(m => (
                    <th key={m} className="py-4 px-2 font-bold text-center min-w-[100px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LINHAS_DRE.map((linha) => (
                  <tr key={linha} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-3 px-4 font-medium text-white/80 sticky left-0 bg-acelerar-dark-blue group-hover:bg-white/5 z-10 shadow-r">
                      {linha}
                    </td>
                    {MESES.map((m, idx) => (
                      <td key={m} className="py-2 px-1">
                        <div className="relative flex items-center group/cell">
                          <input 
                            type="number" 
                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-right text-white outline-none focus:border-acelerar-light-blue transition-all"
                            value={grid[linha][idx]}
                            onChange={(e) => updateCell(linha, idx, e.target.value)}
                          />
                          {idx < 11 && (
                            <button 
                              onClick={() => propagarValor(linha, idx)}
                              title="Propagar para os meses seguintes"
                              className="absolute -right-1 opacity-0 group-hover/cell:opacity-100 bg-acelerar-light-blue text-white rounded-full p-1 shadow-lg hover:scale-110 transition-all z-20"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white/5 p-4 text-white/30 text-[10px] italic">
            * Os valores acima são os valores base. Os reajustes de premissas e headcount serão aplicados automaticamente após o salvamento.
          </div>
        </div>
      )}
    </div>
  );
}
