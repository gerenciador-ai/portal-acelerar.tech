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
  const [empresaAtiva, setEmpresaAtiva] = useState(EMPRESAS[0]);
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear());
  const [tipoVersao, setTipoVersao] = useState('BUDGET');
  const [nomeVersao, setNomeVersao] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Inicializa o grid com zeros
  const [grid, setGrid] = useState(
    LINHAS_DRE.reduce((acc, linha) => ({
      ...acc,
      [linha]: Array(12).fill(0)
    }), {})
  );

  // Função para atualizar uma célula individual
  const updateCell = (linha, mesIdx, valor) => {
    const novoGrid = { ...grid };
    novoGrid[linha][mesIdx] = parseFloat(valor) || 0;
    setGrid(novoGrid);
  };

  // Função da "Setinha" para propagar valores para a direita
  const propagarValor = (linha, mesIdx) => {
    const valorParaCopiar = grid[linha][mesIdx];
    const novoGrid = { ...grid };
    for (let i = mesIdx + 1; i < 12; i++) {
      novoGrid[linha][i] = valorParaCopiar;
    }
    setGrid(novoGrid);
  };

  const handleSalvar = async () => {
    if (!nomeVersao) return alert("Dê um nome para esta versão do orçamento");
    setLoading(true);
    
    try {
      const response = await fetch('/api/financeiro/fpa/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: empresaAtiva.nome,
          ano: anoAtivo,
          tipo: tipoVersao,
          nome: nomeVersao,
          dados: grid
          // Premissas e Headcounts seriam buscados do estado global ou banco
        })
      });

      if (response.ok) {
        alert("Orçamento salvo com sucesso! As premissas foram aplicadas na versão final.");
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      alert("Erro ao salvar orçamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Abas de Empresas (Padrão DFC) */}
      <div className="flex flex-wrap gap-2 items-center bg-black/20 p-2 rounded-xl border border-white/10 overflow-x-auto">
        {EMPRESAS.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setEmpresaAtiva(emp)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-3 shrink-0 ${
              empresaAtiva?.id === emp.id ? 'bg-acelerar-light-blue text-white shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <div className="w-6 h-6 relative flex items-center justify-center">
              <img src={emp.logo} alt={emp.nome} className="max-w-full max-h-full object-contain" />
            </div>
            <span className="text-xs font-bold uppercase">{emp.nome}</span>
          </button>
        ))}
      </div>

      {/* Cabeçalho de Configuração da Versão */}
      <div className="flex flex-wrap gap-4 items-center bg-black/20 p-4 rounded-xl border border-white/10">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Ano</label>
          <select 
            value={anoAtivo} 
            onChange={(e) => setAnoAtivo(e.target.value)}
            className="bg-acelerar-dark-blue border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue"
          >
            {[2024, 2025, 2026].map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/40 uppercase font-bold">Tipo</label>
          <select 
            value={tipoVersao} 
            onChange={(e) => setTipoVersao(e.target.value)}
            className="bg-acelerar-dark-blue border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue"
          >
            <option value="BUDGET">BUDGET (Orçamento)</option>
            <option value="FORECAST">FORECAST (Revisão)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[10px] text-white/40 uppercase font-bold">Nome da Versão</label>
          <input 
            type="text" 
            placeholder="Ex: Planejamento Inicial 2026"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-acelerar-light-blue"
            value={nomeVersao}
            onChange={(e) => setNomeVersao(e.target.value)}
          />
        </div>
        <button 
          onClick={handleSalvar}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg text-sm font-bold transition-colors mt-4 sm:mt-0"
        >
          {loading ? 'SALVANDO...' : 'SALVAR ORÇAMENTO'}
        </button>
      </div>

      {/* Grid de Orçamento */}
      <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-white/40 border-b border-white/10">
                <th className="py-4 px-4 font-bold uppercase sticky left-0 bg-acelerar-dark-blue z-10 min-w-[250px]">Linha do DRE</th>
                {MESES.map(m => (
                  <th key={m} className="py-4 px-2 font-bold text-center min-w-[100px]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_DRE.map((linha) => (
                <tr key={linha} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="py-3 px-4 font-medium text-white/80 sticky left-0 bg-acelerar-dark-blue group-hover:bg-white/5 z-10">
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
                        {/* Botão da Setinha para Propagar */}
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
      </div>
      
      <div className="text-white/30 text-[10px] italic px-2">
        * Os valores acima são os valores base. Os reajustes de premissas e headcount serão aplicados automaticamente após o salvamento.
      </div>
    </div>
  );
}
