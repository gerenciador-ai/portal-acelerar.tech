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
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visao, setVisao] = useState('Mensal');
  const [anoAtivo, setAnoAtivo] = useState(2026);

  // ESTADOS DO DETALHAMENTO
  const [selecionado, setSelecionado] = useState({ mesIdx: null, grupoKey: null, grupoLabel: null });
  const [detalhamento, setDetalhamento] = useState([]);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);

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
                          className={`w-full h-full p-4 text-sm text-right transition-all duration-150 focus:outline-none
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
                      <td className="p-4 text-sm text-white/60 font-mono">
                        {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="p-4 text-sm text-white/80 font-medium">{item.nome || '—'}</td>
                      <td className="p-4 text-sm text-white/50 italic">{item.descricao || '—'}</td>
                      <td className="p-4 text-sm">
                        <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          {item.categoria || '—'}
                        </span>
                      </td>
                      <td className={`p-4 text-sm text-right font-semibold ${(item.valor || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatarMoeda(item.valor || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {detalhamento.length > 0 && (
                <tfoot>
                  <tr className="bg-acelerar-light-blue/10 font-bold border-t border-white/10">
                    <td colSpan="4" className="p-4 text-xs text-acelerar-light-blue uppercase tracking-widest text-right">Total</td>
                    <td className={`p-4 text-sm text-right font-bold ${detalhamento.reduce((acc, i) => acc + (i.valor || 0), 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatarMoeda(detalhamento.reduce((acc, i) => acc + (i.valor || 0), 0))}
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
    <div className="flex flex-col h-full bg-acelerar-dark-blue p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-white/10">
        <div className="flex gap-2">
          <EmpresaTab nome="Consolidado" logo="/logo_acelerar_login.png" isActive={empresaAtiva === 'Consolidado'} onClick={() => setEmpresaAtiva('Consolidado')} />
          <EmpresaTab nome="VMC Tech" logo="/logo_vmctech.png" isActive={empresaAtiva === 'VMC Tech'} onClick={() => setEmpresaAtiva('VMC Tech')} />
          <EmpresaTab nome="Victec" logo="/logo_victec.png" isActive={empresaAtiva === 'Victec'} onClick={() => setEmpresaAtiva('Victec')} />
        </div>
        {empresaAtiva && (
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button onClick={() => setVisao('Mensal')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${visao === 'Mensal' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Mensal</button>
              <button onClick={() => setVisao('Diário')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${visao === 'Diário' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Diário</button>
            </div>
            <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-acelerar-light-blue">
              <option value={2026}>Ano: 2026</option>
            </select>
          </div>
        )}
      </div>
      {!empresaAtiva ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/20 space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest">Selecione uma empresa na aba acima para visualizar o DFC.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Processando dados do Nibo via Supabase...</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-acelerar-light-blue rounded-full"></span>
                Demonstrativo de Fluxo de Caixa - {empresaAtiva}
              </h3>
              {renderTabelaMensal()}
              {renderDetalhamento()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DFCPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full bg-acelerar-dark-blue p-8 items-center justify-center">
        <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DFCContent />
    </Suspense>
  );
}
