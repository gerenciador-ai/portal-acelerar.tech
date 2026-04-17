"use client";
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';

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

function DFCContent() {
  const [empresaAtiva, setEmpresaAtiva] = useState('Victec');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visao, setVisao] = useState('Mensal');
  const [anoAtivo, setAnoAtivo] = useState(2026);

  // ESTADOS DO DETALHAMENTO
  const [selecionado, setSelecionado] = useState({ mesIdx: null, grupoKey: null, grupoLabel: null });
  const [detalhamento, setDetalhamento] = useState([]);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);

  const empresas = [
    { nome: 'Victec', logo: '/logo_victec.png' },
    { nome: 'VMC Tech', logo: '/logo_vmctech.png' },
    { nome: 'GRT', logo: '/logo_GRT.png' },
    { nome: 'Bllog', logo: '/logo_bllog.png' },
    { nome: 'M3', logo: '/logo_m3sistemas.png' },
  ];

  useEffect(() => {
    if (empresaAtiva && empresaAtiva !== 'Consolidado') {
      carregarDados();
    }
  }, [empresaAtiva, anoAtivo]);

  const carregarDados = async () => {
    setLoading(true);
    setDados(null);
    try {
      const res = await fetch(`/api/financeiro/dfc?empresa=${encodeURIComponent(empresaAtiva)}&ano=${anoAtivo}`);
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error('Erro ao carregar DFC:', error);
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO DE FORMATAÇÃO OTIMIZADA (REMOVIDO R$, SUPRIMIDO DECIMAIS PARA >= 1.00)
  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return "—";
    const absValor = Math.abs(valor);
    const options = {
      minimumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
      maximumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
      useGrouping: true,
    };
    return new Intl.NumberFormat('pt-BR', options).format(valor);
  };

  // FUNÇÃO DE CARREGAMENTO DO DETALHAMENTO
  const carregarDetalhamento = async (mesIdx, grupoKey, grupoLabel) => {
    if (selecionado.mesIdx === mesIdx && selecionado.grupoKey === grupoKey) {
      setSelecionado({ mesIdx: null, grupoKey: null, grupoLabel: null });
      setDetalhamento([]);
      return;
    }
    setSelecionado({ mesIdx, grupoKey, grupoLabel });
    setLoadingDetalhamento(true);
    setDetalhamento([]);
    try {
      const mes = mesIdx + 1;
      const res = await fetch(`/api/financeiro/dfc/detalhamento?empresa=${encodeURIComponent(empresaAtiva)}&ano=${anoAtivo}&mes=${mes}&grupo=${encodeURIComponent(grupoKey)}`);
      const data = await res.json();
      setDetalhamento(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar detalhamento:', error);
    } finally {
      setLoadingDetalhamento(false);
    }
  };

  const renderTabelaMensal = () => {
    if (!dados || !dados.matriz) return null;
    const meses = dados.meses || ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const saldoInicial = dados.saldoInicial || 0;

    // CÁLCULO EM CASCATA DOS SALDOS
    let saldoAcumulado = saldoInicial;
    const linhasSaldos = {
      inicial: { key: 'SALDO_INICIAL', label: 'SALDO INICIAL', valores: [] },
      operacional: { key: '(=) SALDO OPERACIONAL LÍQUIDO', label: '(=) SALDO OPERACIONAL LÍQUIDO', valores: [] },
      final: { key: '(=) SALDO LÍQUIDO DO PERÍODO', label: '(=) SALDO LÍQUIDO DO PERÍODO', valores: [] }
    };

    // Encontra a linha de resultado original do NIBO (última linha calculada)
    const linhaResultadoOriginal = dados.matriz.find(l => l.key === '(=) SALDO LÍQUIDO DO PERÍODO');

    if (linhaResultadoOriginal) {
      linhaResultadoOriginal.valores.forEach((valorMesNibo) => {
        // Saldo Inicial do mês
        linhasSaldos.inicial.valores.push(saldoAcumulado);

        // Saldo Operacional Líquido (resultado do mês vindo do NIBO)
        linhasSaldos.operacional.valores.push(valorMesNibo);

        // Saldo Líquido do Período (Saldo Inicial + Saldo Operacional)
        const novoSaldoFinal = saldoAcumulado + valorMesNibo;
        linhasSaldos.final.valores.push(novoSaldoFinal);

        // O saldo final deste mês é o inicial do próximo
        saldoAcumulado = novoSaldoFinal;
      });
    }

    // Cria a matriz final para renderização
    const matrizFinal = [
      linhasSaldos.inicial, // SALDO INICIAL no topo
      ...dados.matriz.filter(l => l.key !== '(=) SALDO LÍQUIDO DO PERÍODO'), // Todas as linhas originais, exceto a última
      linhasSaldos.operacional, // SALDO OPERACIONAL LÍQUIDO (renomeado)
      linhasSaldos.final // SALDO LÍQUIDO DO PERÍODO (novo cálculo)
    ];

    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50 backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] text-white/50 uppercase font-bold tracking-widest">
              <th className="p-4 border-b border-white/10">Categoria</th>
              {meses.map(m => <th key={m} className="p-4 border-b border-white/10 text-right">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrizFinal.map((linha) => {
              const isTotal = linha.key.startsWith('(=)') || linha.key === 'SALDO_INICIAL';
              return (
                <tr key={linha.key} className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}>
                  <td className={`p-4 text-[11px] ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha.label}</td>
                  {linha.valores.map((valor, mIdx) => {
                    const isSelecionada = selecionado.mesIdx === mIdx && selecionado.grupoKey === linha.key;
                    // Apenas linhas que não são de saldo podem ser clicadas para detalhamento
                    const podeClicar = !isTotal || linha.key.startsWith('(=)') && !linha.key.includes('SALDO');
                    
                    return (
                      <td key={mIdx} className="p-0 relative group">
                        <button
                          onClick={() => podeClicar && carregarDetalhamento(mIdx, linha.key, linha.label)}
                          disabled={!podeClicar}
                          className={`w-full h-full p-4 text-[11px] text-right transition-all duration-150 focus:outline-none
                            ${(valor || 0) < 0 ? 'text-red-400' : 'text-white'}
                            ${isSelecionada ? 'ring-2 ring-inset ring-acelerar-light-blue bg-acelerar-light-blue/10' : podeClicar ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}
                          `}
                        >
                          {formatarMoeda(valor || 0)}
                        </button>
                        {podeClicar && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white/80 text-[10px] py-1 px-2 rounded shadow-xl border border-white/10 whitespace-nowrap">
                              Exibir detalhamento
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDetalhamento = () => {
    const meses = dados?.meses || ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const nomeMes = selecionado.mesIdx !== null ? meses[selecionado.mesIdx] : null;
    const nomeGrupo = selecionado.grupoLabel;

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
          Detalhamento dos Lançamentos
          {nomeMes && nomeGrupo && (
            <span className="ml-2 text-xs font-normal text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              {nomeGrupo} • {nomeMes}/{anoAtivo}
            </span>
          )}
        </h3>

        {!selecionado.mesIdx && selecionado.mesIdx !== 0 ? (
          <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-white/10 bg-white/5">
            <p className="text-xs text-white/30 font-medium uppercase tracking-widest">
              Para exibir o detalhamento, selecione o mês e a categoria que deseja detalhar no quadro acima.
            </p>
          </div>
        ) : loadingDetalhamento ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3">
            <div className="w-6 h-6 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Buscando lançamentos no Nibo...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50 backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] text-white/50 uppercase font-bold tracking-widest">
                  <th className="p-4 border-b border-white/10">Data</th>
                  <th className="p-4 border-b border-white/10">Nome</th>
                  <th className="p-4 border-b border-white/10">Descrição</th>
                  <th className="p-4 border-b border-white/10">Categoria</th>
                  <th className="p-4 border-b border-white/10 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {detalhamento.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-xs text-white/30 italic">
                      Nenhum lançamento encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  detalhamento.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5">
                      <td className="p-4 text-[11px] text-white/60 font-mono">
                        {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="p-4 text-[11px] text-white/80 font-medium">{item.nome || '—'}</td>
                      <td className="p-4 text-[11px] text-white/50 italic">{item.descricao || '—'}</td>
                      <td className="p-4 text-[11px]">
                        <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          {item.categoria || '—'}
                        </span>
                      </td>
                      <td className={`p-4 text-[11px] text-right font-semibold ${(item.valor || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatarMoeda(item.valor || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {detalhamento.length > 0 && (
                <tfoot>
                  <tr className="bg-white/5 text-[11px] font-bold border-t border-white/10">
                    <td colSpan="4" className="p-4 text-right text-white/80 uppercase tracking-widest">Total do Período</td>
                    <td className={`p-4 text-right ${(detalhamento.reduce((acc, i) => acc + i.valor, 0) || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatarMoeda(detalhamento.reduce((acc, i) => acc + i.valor, 0) || 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-acelerar-dark-blue p-8 font-sans text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER & SELEÇÃO DE EMPRESA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
            <p className="text-white/40 text-sm uppercase tracking-widest font-medium">Demonstrativo de Fluxo de Caixa (Regime de Caixa)</p>
          </div>

          <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            {empresas.map((emp) => (
              <EmpresaTab 
                key={emp.nome}
                nome={emp.nome}
                logo={emp.logo}
                isActive={empresaAtiva === emp.nome}
                onClick={() => setEmpresaAtiva(emp.nome)}
              />
            ))}
          </div>
        </div>

        {/* FILTROS SECUNDÁRIOS */}
        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2">
            {['Mensal', 'Trimestral', 'Anual'].map((v) => (
              <button
                key={v}
                onClick={() => setVisao(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${visao === v ? 'bg-acelerar-light-blue text-acelerar-dark-blue shadow-lg shadow-acelerar-light-blue/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <select 
              value={anoAtivo}
              onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
              className="bg-transparent text-white/60 text-xs font-bold outline-none cursor-pointer hover:text-white transition-colors"
            >
              <option value={2026} className="bg-acelerar-dark-blue">ANO: 2026</option>
              <option value={2025} className="bg-acelerar-dark-blue">ANO: 2025</option>
            </select>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-12 h-12 border-4 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-white/40 font-medium uppercase tracking-widest animate-pulse">Consolidando dados do Nibo...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {renderTabelaMensal()}
            {renderDetalhamento()}
          </div>
        )}

      </div>
    </div>
  );
}

export default function DFCPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <DFCContent />
    </Suspense>
  );
}
