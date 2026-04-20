"use client";
import { useState, useEffect, Suspense, useMemo } from 'react';
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

  // CACHE DE DADOS POR EMPRESA PARA CONSOLIDAÇÃO
  const [cacheDados, setCacheDados] = useState({});

  // ESTADOS DO DETALHAMENTO
  const [selecionado, setSelecionado] = useState({ mesIdx: null, grupoKey: null, grupoLabel: null });
  const [detalhamento, setDetalhamento] = useState([]);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);

  const empresas = [
    { nome: "VMC Tech", logo: "/logo_vmctech.png" },
    { nome: "Victec", logo: "/logo_victec.png" },
    { nome: "GRT", logo: "/logo_GRT.png" },
    { nome: "Bllog", logo: "/logo_bllog.png" },
    { nome: "M3", logo: "/logo_m3sistemas.png" },
    { nome: "Acelerar", logo: "/logo_acelerar_sidebar.png" },
    { nome: "bLive", logo: "/logo_blive.png" },
    { nome: "Condway", logo: "/logo_condway.png" },
    { nome: "Isket", logo: "/logo_isket.png" }
  ];

  useEffect(() => {
    if (empresaAtiva) {
      if (empresaAtiva === 'Consolidado') {
        carregarConsolidado();
      } else {
        carregarDados(empresaAtiva);
      }
    }
  }, [empresaAtiva, anoAtivo]);

  const carregarDados = async (nomeEmpresa) => {
    setLoading(true);
    setDados(null);
    try {
      const res = await fetch(`/api/financeiro/dfc?empresa=${encodeURIComponent(nomeEmpresa)}&ano=${anoAtivo}`);
      const data = await res.json();
      setDados(data);
      setCacheDados(prev => ({ ...prev, [nomeEmpresa]: data }));
    } catch (error) {
      console.error('Erro ao carregar DFC:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarConsolidado = async () => {
    setLoading(true);
    setDados(null);
    try {
      // Carrega em paralelo todas as empresas que ainda não estão no cache
      const promessas = empresas.map(async (emp) => {
        if (!cacheDados[emp.nome]) {
          const res = await fetch(`/api/financeiro/dfc?empresa=${encodeURIComponent(emp.nome)}&ano=${anoAtivo}`);
          return { nome: emp.nome, data: await res.json() };
        }
        return { nome: emp.nome, data: cacheDados[emp.nome] };
      });

      const resultados = await Promise.all(promessas);
      const novoCache = {};
      resultados.forEach(r => { novoCache[r.nome] = r.data; });
      setCacheDados(prev => ({ ...prev, ...novoCache }));

      // Gera a matriz consolidada
      const consolidado = gerarDadosConsolidados(novoCache);
      setDados(consolidado);
    } catch (error) {
      console.error('Erro ao consolidar DFC:', error);
    } finally {
      setLoading(false);
    }
  };

  const gerarDadosConsolidados = (cache) => {
    const primeiraEmpresa = Object.values(cache)[0];
    if (!primeiraEmpresa || !primeiraEmpresa.matriz) return null;

    const matrizConsolidada = primeiraEmpresa.matriz.map(linhaOriginal => {
      const novaLinha = { ...linhaOriginal, valores: new Array(12).fill(0) };
      
      Object.values(cache).forEach(empresaData => {
        const linhaEmpresa = empresaData.matriz?.find(l => l.key === linhaOriginal.key);
        if (linhaEmpresa) {
          linhaEmpresa.valores.forEach((v, i) => {
            novaLinha.valores[i] += (v || 0);
          });
        }
      });
      return novaLinha;
    });

    const saldoInicialConsolidado = Object.values(cache).reduce((acc, emp) => acc + (emp.saldoInicial || 0), 0);

    return {
      ...primeiraEmpresa,
      saldoInicial: saldoInicialConsolidado,
      matriz: matrizConsolidada
    };
  };

  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(valor);
  };

  const carregarDetalhamento = async (mesIdx, grupoKey, grupoLabel) => {
    if (selecionado.mesIdx === mesIdx && selecionado.grupoKey === grupoKey) {
      setSelecionado({ mesIdx: null, grupoKey: null, grupoLabel: null });
      setDetalhamento([]);
      return;
    }
    setSelecionado({ mesIdx, grupoKey, grupoLabel });
    
    if (empresaAtiva === 'Consolidado') {
      // Detalhamento Consolidado: Mostra quanto cada empresa representa
      const detalheConsolidado = empresas.map(emp => {
        const dadosEmpresa = cacheDados[emp.nome];
        const linha = dadosEmpresa?.matriz?.find(l => l.key === grupoKey);
        const valor = linha ? linha.valores[mesIdx] : 0;
        return {
          nome: emp.nome,
          valor: valor,
          isConsolidado: true
        };
      }).filter(item => item.valor !== 0);
      
      setDetalhamento(detalheConsolidado);
    } else {
      // Detalhamento Normal: Busca lançamentos no Nibo
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
    }
  };

  const renderTabelaMensal = () => {
    if (!dados || !dados.matriz) return null;
    const meses = dados.meses || ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const saldoInicial = dados.saldoInicial || 0;

    let saldoAcumulado = saldoInicial;
    const linhasSaldos = {
      inicial: { key: 'SALDO_INICIAL', label: 'SALDO INICIAL', valores: [] },
      operacional: { key: '(=) SALDO OPERACIONAL LÍQUIDO', label: '(=) SALDO OPERACIONAL LÍQUIDO', valores: [] },
      final: { key: '(=) SALDO LÍQUIDO DO PERÍODO', label: '(=) SALDO LÍQUIDO DO PERÍODO', valores: [] }
    };

    const linhaResultadoOriginal = dados.matriz.find(l => l.key === '(=) SALDO LÍQUIDO DO PERÍODO');

    if (linhaResultadoOriginal) {
      linhaResultadoOriginal.valores.forEach((valorMesNibo) => {
        linhasSaldos.inicial.valores.push(saldoAcumulado);
        linhasSaldos.operacional.valores.push(valorMesNibo);
        const novoSaldoFinal = saldoAcumulado + valorMesNibo;
        linhasSaldos.final.valores.push(novoSaldoFinal);
        saldoAcumulado = novoSaldoFinal;
      });
    }

    const matrizFinal = [
      linhasSaldos.inicial,
      ...dados.matriz.filter(l => l.key !== '(=) SALDO LÍQUIDO DO PERÍODO'),
      linhasSaldos.operacional,
      linhasSaldos.final
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
                  <td className={`p-4 text-sm ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha.label}</td>
                  {linha.valores.map((valor, mIdx) => {
                    const isSelecionada = selecionado.mesIdx === mIdx && selecionado.grupoKey === linha.key;
                    const podeClicar = !isTotal || linha.key.startsWith('(=)') && !linha.key.includes('SALDO') || (empresaAtiva === 'Consolidado' && linha.key === 'SALDO_INICIAL');
                    
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
    const isConsolidado = empresaAtiva === 'Consolidado';

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
          {isConsolidado ? 'Composição por Empresa' : 'Detalhamento dos Lançamentos'}
          {nomeMes && nomeGrupo && (
            <span className="ml-2 text-xs font-normal text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              {nomeGrupo} • {nomeMes}/{anoAtivo}
            </span>
          )}
        </h3>

        {!selecionado.mesIdx && selecionado.mesIdx !== 0 ? (
          <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-white/10 bg-white/5">
            <p className="text-xs text-white/30 font-medium uppercase tracking-widest">
              Selecione um valor na tabela acima para visualizar o detalhamento.
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
                  {isConsolidado ? (
                    <>
                      <th className="p-4 border-b border-white/10">Empresa</th>
                      <th className="p-4 border-b border-white/10 text-right">Valor</th>
                      <th className="p-4 border-b border-white/10 text-right">% Participação</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 border-b border-white/10">Data</th>
                      <th className="p-4 border-b border-white/10">Nome</th>
                      <th className="p-4 border-b border-white/10">Descrição</th>
                      <th className="p-4 border-b border-white/10">Categoria</th>
                      <th className="p-4 border-b border-white/10 text-right">Valor</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {detalhamento.length === 0 ? (
                  <tr>
                    <td colSpan={isConsolidado ? 3 : 5} className="p-8 text-center text-xs text-white/30 italic">
                      Nenhum dado encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  detalhamento.map((item, idx) => {
                    const total = detalhamento.reduce((acc, i) => acc + (i.valor || 0), 0);
                    const participacao = total !== 0 ? ((item.valor / total) * 100).toFixed(1) : 0;

                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5">
                        {isConsolidado ? (
                          <>
                            <td className="p-4 text-sm text-white/80 font-medium">{item.nome}</td>
                            <td className={`p-4 text-sm text-right font-semibold ${(item.valor || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                              {formatarMoeda(item.valor || 0)}
                            </td>
                            <td className="p-4 text-sm text-right text-white/40 font-mono">{participacao}%</td>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {detalhamento.length > 0 && (
                <tfoot>
                  <tr className="bg-acelerar-light-blue/10 font-bold border-t border-white/10">
                    <td colSpan={isConsolidado ? 1 : 4} className="p-4 text-xs text-acelerar-light-blue uppercase tracking-widest text-right">Total Consolidado</td>
                    <td className={`p-4 text-sm text-right font-bold ${detalhamento.reduce((acc, i) => acc + (i.valor || 0), 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatarMoeda(detalhamento.reduce((acc, i) => acc + (i.valor || 0), 0))}
                    </td>
                    {isConsolidado && <td className="p-4 text-sm text-right text-acelerar-light-blue font-mono">100%</td>}
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
          {empresas.map(emp => (
            <EmpresaTab key={emp.nome} nome={emp.nome} logo={emp.logo} isActive={empresaAtiva === emp.nome} onClick={() => setEmpresaAtiva(emp.nome)} />
          ))}
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
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest">
                {empresaAtiva === 'Consolidado' ? 'Consolidando dados de todas as empresas...' : 'Processando dados do Nibo via Supabase...'}
              </p>
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
