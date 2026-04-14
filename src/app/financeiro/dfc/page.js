'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Componente interno que usa useSearchParams
function DFCContent() {
  const searchParams = useSearchParams();
  const [empresa, setEmpresa] = useState('Victec');
  const [ano, setAno] = useState('2026');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para o detalhamento
  const [detalhamento, setDetalhamento] = useState([]);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);
  const [selecionado, setSelecionado] = useState({ mes: null, grupo: null });

  const meses = [
    { id: 1, nome: 'JAN' }, { id: 2, nome: 'FEV' }, { id: 3, nome: 'MAR' },
    { id: 4, nome: 'ABR' }, { id: 5, nome: 'MAI' }, { id: 6, nome: 'JUN' },
    { id: 7, nome: 'JUL' }, { id: 8, nome: 'AGO' }, { id: 9, nome: 'SET' },
    { id: 10, nome: 'OUT' }, { id: 11, nome: 'NOV' }, { id: 12, nome: 'DEZ' }
  ];

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/financeiro/dfc?empresa=${empresa}&ano=${ano}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDados(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhamento = async (mes, grupo) => {
    setLoadingDetalhamento(true);
    setSelecionado({ mes, grupo });
    try {
      const res = await fetch(`/api/financeiro/dfc/detalhamento?empresa=${empresa}&ano=${ano}&mes=${mes}&grupo=${encodeURIComponent(grupo)}`);
      const json = await res.json();
      setDetalhamento(json);
    } catch (err) {
      console.error('Erro ao carregar detalhamento:', err);
    } finally {
      setLoadingDetalhamento(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [empresa, ano]);

  if (loading && !dados) return <div className="p-8 text-white">Carregando DFC...</div>;
  if (error) return <div className="p-8 text-red-500">Erro: {error}</div>;

  const matriz = dados?.matriz || {};

  const renderCelula = (grupo, mesId) => {
    const valor = matriz[grupo]?.[mesId] || 0;
    const isSelecionado = selecionado.mes === mesId && selecionado.grupo === grupo;
    
    const colorClass = valor < 0 ? 'text-red-400' : valor > 0 ? 'text-white' : 'text-gray-500';
    const borderClass = isSelecionado ? 'ring-2 ring-yellow-400 bg-blue-900/40' : 'hover:bg-blue-800/30';

    return (
      <td key={mesId} className="p-0 border border-blue-800/50 relative group">
        <button
          onClick={() => carregarDetalhamento(mesId, grupo)}
          className={`w-full h-full p-3 text-right transition-all duration-200 ${colorClass} ${borderClass} focus:outline-none`}
        >
          {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
            <div className="bg-blue-900 text-white text-[10px] py-1 px-2 rounded shadow-lg border border-blue-700 whitespace-nowrap">
              Exibir detalhamento
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-900"></div>
            </div>
          </div>
        </button>
      </td>
    );
  };

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-white font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold border-l-4 border-blue-500 pl-4 uppercase tracking-wider">
          Demonstrativo de Fluxo de Caixa - {empresa}
        </h1>
        
        <div className="flex gap-4">
          <div className="flex bg-blue-900/50 p-1 rounded-lg border border-blue-800">
            {['Victec', 'VMC Tech'].map(e => (
              <button
                key={e}
                onClick={() => setEmpresa(e)}
                className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${empresa === e ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-300 hover:text-white'}`}
              >
                {e.toUpperCase()}
              </button>
            ))}
          </div>
          
          <select 
            value={ano} 
            onChange={(e) => setAno(e.target.value)}
            className="bg-blue-900/50 border border-blue-800 text-white text-xs font-bold px-4 py-2 rounded-lg outline-none focus:border-blue-500"
          >
            <option value="2026">Ano: 2026</option>
            <option value="2025">Ano: 2025</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-blue-800 shadow-2xl bg-blue-950/20 backdrop-blur-sm mb-12">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-blue-900/40 text-blue-300 uppercase tracking-tighter">
              <th className="p-4 text-left border-b border-blue-800 sticky left-0 bg-[#0f172a] z-10 w-64">Categoria</th>
              {meses.map(m => (
                <th key={m.id} className="p-4 text-center border-b border-blue-800 w-32">{m.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'RECEITAS OPERACIONAIS', grupo: 'RECEITAS OPERACIONAIS', bold: true },
              { label: '(-) IMPOSTOS SOBRE VENDAS', grupo: '(-) IMPOSTOS SOBRE VENDAS', color: 'text-red-400' },
              { label: '(=) RECEITA LÍQUIDA', grupo: '(=) RECEITA LÍQUIDA', bold: true, bg: 'bg-blue-900/20', isCalculated: true },
              { label: '(-) CUSTOS OPERACIONAIS', grupo: '(-) CUSTOS OPERACIONAIS', color: 'text-red-400' },
              { label: '(-) DESPESAS ADMINISTRATIVAS', grupo: '(-) DESPESAS ADMINISTRATIVAS', color: 'text-red-400' },
              { label: '(-) DESPESAS COMERCIAIS', grupo: '(-) DESPESAS COMERCIAIS', color: 'text-red-400' },
              { label: '(=) FLUXO OPERACIONAL (FCO)', grupo: '(=) FLUXO OPERACIONAL (FCO)', bold: true, bg: 'bg-blue-900/20', isCalculated: true },
              { label: '(+/-) FLUXO DE INVESTIMENTO (FCI)', grupo: '(+/-) FLUXO DE INVESTIMENTO (FCI)' },
              { label: '(+/-) FLUXO DE FINANCIAMENTO (FCF)', grupo: '(+/-) FLUXO DE FINANCIAMENTO (FCF)' },
              { label: '(-) DESPESAS FINANCEIRAS', grupo: '(-) DESPESAS FINANCEIRAS', color: 'text-red-400' },
              { label: 'OUTROS / NÃO CLASSIFICADOS', grupo: 'OUTROS / NÃO CLASSIFICADOS', color: 'text-gray-400' },
              { label: '(=) SALDO LÍQUIDO DO PERÍODO', grupo: '(=) SALDO LÍQUIDO DO PERÍODO', bold: true, bg: 'bg-blue-900/40', isCalculated: true }
            ].map((row, idx) => (
              <tr key={idx} className={`${row.bg || ''} hover:bg-blue-900/10 transition-colors`}>
                <td className={`p-4 border border-blue-800/50 sticky left-0 bg-[#0f172a] z-10 ${row.bold ? 'font-bold text-blue-400' : 'text-gray-300'} ${row.color || ''}`}>
                  {row.label}
                </td>
                {meses.map(m => renderCelula(row.grupo, m.id))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 border-t border-blue-800 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <span className="w-2 h-8 bg-yellow-500 rounded-full"></span>
            DETALHAMENTO DOS LANÇAMENTOS
            {selecionado.mes && selecionado.grupo && (
              <span className="text-sm font-normal text-blue-400 ml-4 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-800">
                {selecionado.grupo} • {meses.find(m => m.id === selecionado.mes).nome}/{ano}
              </span>
            )}
          </h2>
          
          {loadingDetalhamento && (
            <div className="flex items-center gap-2 text-yellow-500 animate-pulse">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-xs font-bold uppercase tracking-widest">Carregando dados do NIBO...</span>
            </div>
          )}
        </div>

        {!selecionado.mes ? (
          <div className="bg-blue-950/20 border-2 border-dashed border-blue-800 rounded-xl p-12 text-center">
            <div className="text-blue-400 mb-2 opacity-50">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-blue-300 font-medium">Para exibir o detalhamento, selecione o mês e a categoria que deseja detalhar no quadro acima.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-blue-800 shadow-2xl bg-blue-950/20">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-blue-900/60 text-blue-200 uppercase tracking-wider">
                  <th className="p-4 text-left border-b border-blue-800">Data</th>
                  <th className="p-4 text-left border-b border-blue-800">Nome</th>
                  <th className="p-4 text-left border-b border-blue-800">Descrição</th>
                  <th className="p-4 text-left border-b border-blue-800">Categoria</th>
                  <th className="p-4 text-left border-b border-blue-800">Centro de Custo</th>
                  <th className="p-4 text-right border-b border-blue-800">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/50">
                {detalhamento.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-500 italic">Nenhum lançamento encontrado para este filtro.</td>
                  </tr>
                ) : (
                  detalhamento.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-900/20 transition-colors group">
                      <td className="p-4 text-blue-300 font-mono">
                        {new Date(item.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 font-bold group-hover:text-blue-400 transition-colors uppercase">{item.nome}</td>
                      <td className="p-4 text-gray-400 italic">{item.descricao}</td>
                      <td className="p-4">
                        <span className="bg-blue-900/40 px-2 py-1 rounded border border-blue-800 text-[10px] text-blue-200">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{item.centro_costo}</td>
                      <td className={`p-4 text-right font-bold ${item.valor < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {detalhamento.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-900/40 font-bold border-t border-blue-800">
                    <td colSpan="5" className="p-4 text-right text-blue-300 uppercase tracking-widest">Total do Período</td>
                    <td className={`p-4 text-right ${detalhamento.reduce((acc, i) => acc + i.valor, 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {detalhamento.reduce((acc, i) => acc + i.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente principal com Suspense
export default function DFCPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white bg-[#0f172a] min-h-screen">Carregando ambiente...</div>}>
      <DFCContent />
    </Suspense>
  );
}
