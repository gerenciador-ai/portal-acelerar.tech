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

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-acelerar-dark-blue border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
            {title}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function DFCContent() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visao, setVisao] = useState('Mensal');
  const [anoAtivo, setAnoAtivo] = useState(2026);

  // CACHE DE DADOS POR EMPRESA PARA CONSOLIDAÇÃO E RATEIO
  const [cacheDados, setCacheDados] = useState({});

  // ESTADOS DO DETALHAMENTO
  const [selecionado, setSelecionado] = useState({ mesIdx: null, grupoKey: null, grupoLabel: null });
  const [detalhamento, setDetalhamento] = useState([]);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      // DISPARA CARGA DAS OUTRAS EM BACKGROUND PARA INTERCOMPANY (Lógica do ajuste integrada)
      const empresasParaCarregar = empresas.filter(e => e.nome !== nomeEmpresa && !cacheDados[e.nome]);
      if (empresasParaCarregar.length > 0) {
        Promise.all(empresasParaCarregar.map(async (emp) => {
          try {
            const r = await fetch(`/api/financeiro/dfc?empresa=${encodeURIComponent(emp.nome)}&ano=${anoAtivo}`);
            const d = await r.json();
            setCacheDados(prev => ({ ...prev, [emp.nome]: d }));
          } catch (e) {
            console.error(`Erro ao carregar cache para ${emp.nome}:`, e);
          }
        }));
      }
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
    const recuperacaoIntercompanyConsolidada = new Array(12).fill(0);
    Object.values(cache).forEach(empresaData => {
      empresaData.recuperacaoIntercompany?.forEach((v, i) => {
        recuperacaoIntercompanyConsolidada[i] += (v || 0);
      });
    });

    const rateioRecebidoIntercompanyConsolidado = new Array(12).fill(0);
    Object.values(cache).forEach(empresaData => {
      empresaData.rateioRecebidoIntercompany?.forEach((v, i) => {
        rateioRecebidoIntercompanyConsolidado[i] += (v || 0);
      });
    });

    return {
      ...primeiraEmpresa,
      empresa: 'Consolidado',
      saldoInicial: saldoInicialConsolidado,
      matriz: matrizConsolidada,
      recuperacaoIntercompany: recuperacaoIntercompanyConsolidada,
      rateioRecebidoIntercompany: rateioRecebidoIntercompanyConsolidado
    };
  };

  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return '0';
    const absValor = Math.abs(valor);
    const options = {
      minimumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
      maximumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
      useGrouping: true,
    };
    return new Intl.NumberFormat('pt-BR', options).format(valor);
  };

  const carregarDetalhamento = async (mesIdx, grupoKey, grupoLabel) => {
    setSelecionado({ mesIdx, grupoKey, grupoLabel });
    setIsModalOpen(true);
    
    if (empresaAtiva === 'Consolidado') {
      const detalheConsolidado = empresas.map(emp => {
        const dadosEmpresa = cacheDados[emp.nome];
        const linha = dadosEmpresa?.matriz?.find(l => l.key === grupoKey);
        const valor = linha ? linha.valores[mesIdx] : 0;
        return { nome: emp.nome, valor: valor, isConsolidado: true };
      }).filter(item => item.valor !== 0);
      setDetalhamento(detalheConsolidado);
    } else {
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

  const exportarExcel = (tipo) => {
    alert(`Exportando ${tipo === 'exibicao' ? 'lançamentos em exibição' : 'histórico completo'} para Excel...`);
  };

  // ── RECONCILIAÇÃO INTERCOMPANY CRUZADA (Lógica integrada do ajuste) ──────────
  const dadosComIntercompanyCruzado = useMemo(() => {
    if (!dados || !dados.matriz || empresaAtiva === 'Consolidado') return dados;
    const d = JSON.parse(JSON.stringify(dados));
    const nomeAtual = empresaAtiva.trim();
    
    // O rateio recebido da empresa atual é a soma de tudo que as OUTRAS empresas recuperaram DELA
    const novoRateioRecebido = new Array(12).fill(0);

    Object.keys(cacheDados).forEach(nomeOutra => {
      if (nomeOutra.trim() === nomeAtual) return;
      const dadosOutra = cacheDados[nomeOutra];
      // detalheRecuperacao é um array de 12 meses, onde cada mês é um objeto { "Destino": valor }
      if (dadosOutra.detalheRecuperacao) {
        dadosOutra.detalheRecuperacao.forEach((mesObj, idx) => {
          // Procura se a empresa atual (nomeAtual) está nos destinos de recuperação da outra empresa
          const valorParaMim = mesObj[nomeAtual] || 0;
          novoRateioRecebido[idx] += valorParaMim;
        });
      }
    });

    d.rateioRecebidoIntercompany = novoRateioRecebido;
    return d;
  }, [dados, cacheDados, empresaAtiva]);

  const gerarDadosGerenciais = useMemo(() => {
    const d = dadosComIntercompanyCruzado;
    if (!d || !d.matriz) return null;
    const matrizReal = d.matriz;
    const recuperacaoIntercompany = d.recuperacaoIntercompany || new Array(12).fill(0);
    const rateioRecebidoIntercompany = d.rateioRecebidoIntercompany || new Array(12).fill(0);
    const meses = d.meses || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    const LINHAS_DFC_GERENCIAL = [
      { key: "RECEITAS OPERACIONAIS", label: "RECEITAS OPERACIONAIS", tipo: "linha" },
      { key: "(-) IMPOSTOS SOBRE VENDAS", label: "(-) IMPOSTOS SOBRE VENDAS", tipo: "linha" },
      { key: "(=) RECEITA LÍQUIDA", label: "(=) RECEITA LÍQUIDA", tipo: "calculado" },
      { key: "(-) CUSTOS OPERACIONAIS", label: "(-) CUSTOS OPERACIONAIS", tipo: "linha" },
      { key: "(-) DESPESAS ADMINISTRATIVAS", label: "(-) DESPESAS ADMINISTRATIVAS", tipo: "linha" },
      { key: "(-) DESPESAS COMERCIAIS", label: "(-) DESPESAS COMERCIAIS", tipo: "linha" },
      { key: "(=) FLUXO OPERACIONAL (FCO)", label: "(=) FLUXO OPERACIONAL (FCO)", tipo: "calculado" },
      { key: "(+) RECUPERAÇÃO INTERCOMPANY", label: "(+) RECUPERAÇÃO INTERCOMPANY", tipo: "linha" },
      { key: "(-) RATEIO RECEBIDO INTERCOMPANY", label: "(-) RATEIO RECEBIDO INTERCOMPANY", tipo: "linha" },
      { key: "(=) FLUXO OPERACIONAL GERENCIAL (FCO)", label: "(=) FLUXO OPERACIONAL GERENCIAL (FCO)", tipo: "calculado" },
      { key: "(+/-) FLUXO DE INVESTIMENTO (FCI)", label: "(+/-) FLUXO DE INVESTIMENTO (FCI)", tipo: "linha" },
      { key: "(-) DESPESAS FINANCEIRAS", label: "(-) DESPESAS FINANCEIRAS", tipo: "linha" },
      { key: "OUTROS / NÃO CLASSIFICADOS", label: "OUTROS / NÃO CLASSIFICADOS", tipo: "linha" },
      { key: "(=) SALDO LÍQUIDO DO PERÍODO", label: "(=) SALDO LÍQUIDO DO PERÍODO", tipo: "calculado" },
    ];

    const matrizGerencial = LINHAS_DFC_GERENCIAL.map(linha => {
      const valores = meses.map((_, mIdx) => {
        if (linha.tipo === "calculado") return null;
        if (linha.key === "(+) RECUPERAÇÃO INTERCOMPANY") return recuperacaoIntercompany[mIdx];
        if (linha.key === "(-) RATEIO RECEBIDO INTERCOMPANY") return -rateioRecebidoIntercompany[mIdx];
        const linhaReal = matrizReal.find(l => l.key === linha.key);
        return linhaReal ? linhaReal.valores[mIdx] : 0;
      });
      return { ...linha, valores };
    });

    for (let m = 0; m < 12; m++) {
      const get = (k) => matrizGerencial.find(r => r.key === k)?.valores[m] || 0;
      const set = (k, v) => { const row = matrizGerencial.find(r => r.key === k); if (row) row.valores[m] = v; };
      
      const recLiq = get("RECEITAS OPERACIONAIS") + get("(-) IMPOSTOS SOBRE VENDAS");
      set("(=) RECEITA LÍQUIDA", recLiq);
      
      const fcoReal = recLiq + get("(-) CUSTOS OPERACIONAIS") + get("(-) DESPESAS ADMINISTRATIVAS") + get("(-) DESPESAS COMERCIAIS");
      set("(=) FLUXO OPERACIONAL (FCO)", fcoReal);
      
      const fcoGerencial = fcoReal + get("(+) RECUPERAÇÃO INTERCOMPANY") + get("(-) RATEIO RECEBIDO INTERCOMPANY");
      set("(=) FLUXO OPERACIONAL GERENCIAL (FCO)", fcoGerencial);
      
      const saldoGerencial = fcoGerencial + get("(+/-) FLUXO DE INVESTIMENTO (FCI)") + get("(-) DESPESAS FINANCEIRAS") + get("OUTROS / NÃO CLASSIFICADOS");
      set("(=) SALDO LÍQUIDO DO PERÍODO", saldoGerencial);
    }
    return matrizGerencial;
  }, [dadosComIntercompanyCruzado]);

  const renderTabelaMensal = (matrizParaRenderizar, titulo, saldoInicialBase) => {
    if (!matrizParaRenderizar) return null;
    const meses = dados.meses || ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    let saldoAcumulado = saldoInicialBase;
    const linhasSaldos = {
      inicial: { key: 'SALDO_INICIAL', label: 'SALDO INICIAL', valores: [] },
      operacional: { key: '(=) SALDO OPERACIONAL LÍQUIDO', label: '(=) SALDO OPERACIONAL LÍQUIDO', valores: [] },
      final: { key: '(=) SALDO LÍQUIDO DO PERÍODO', label: '(=) SALDO LÍQUIDO DO PERÍODO', valores: [] }
    };
    const linhaResultadoOriginal = matrizParaRenderizar.find(l => l.key === '(=) SALDO LÍQUIDO DO PERÍODO');
    if (linhaResultadoOriginal) {
      linhaResultadoOriginal.valores.forEach((valorMes) => {
        linhasSaldos.inicial.valores.push(saldoAcumulado);
        linhasSaldos.operacional.valores.push(valorMes);
        const novoSaldoFinal = saldoAcumulado + valorMes;
        linhasSaldos.final.valores.push(novoSaldoFinal);
        saldoAcumulado = novoSaldoFinal;
      });
    }
    const matrizFinal = [linhasSaldos.inicial, ...matrizParaRenderizar.filter(l => l.key !== '(=) SALDO LÍQUIDO DO PERÍODO'), linhasSaldos.operacional, linhasSaldos.final];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-acelerar-light-blue rounded-full"></span>
          {titulo}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[9px] text-white/50 uppercase font-bold tracking-widest">
                <th className="p-3 border-b border-white/10">Categoria</th>
                {meses.map(m => <th key={m} className="p-3 border-b border-white/10 text-right">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrizFinal.map((linha) => {
                const isTotal = linha.key.startsWith('(=)') || linha.key === 'SALDO_INICIAL';
                return (
                  <tr key={linha.key} className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}>
                    <td className={`p-3 text-[11px] ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha.label}</td>
                    {linha.valores.map((valor, mIdx) => {
                      const podeClicar = !isTotal || (linha.key.startsWith('(=)') && !linha.key.includes('SALDO')) || (empresaAtiva === 'Consolidado' && linha.key === 'SALDO_INICIAL');
                      return (
                        <td key={mIdx} className="p-0 relative group">
                          <button
                            onClick={() => podeClicar && carregarDetalhamento(mIdx, linha.key, linha.label)}
                            disabled={!podeClicar}
                            className={`w-full h-full p-3 text-[11px] text-right transition-all duration-150 focus:outline-none
                              ${(valor || 0) < 0 ? 'text-red-400' : 'text-white'}
                              ${podeClicar ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}
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
      </div>
    );
  };

  const renderDetalhamentoModal = () => {
    const meses = dados?.meses || ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const nomeMes = selecionado.mesIdx !== null ? meses[selecionado.mesIdx] : null;
    const nomeGrupo = selecionado.grupoLabel;
    const isConsolidado = empresaAtiva === 'Consolidado';

    return (
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={`${isConsolidado ? 'Composição por Empresa' : 'Detalhamento dos Lançamentos'} - ${nomeMes} / ${nomeGrupo}`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-end gap-3">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button onClick={() => exportarExcel('exibicao')} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors">Exportar Exibição</button>
              <div className="w-px h-4 bg-white/10 self-center"></div>
              <button onClick={() => exportarExcel('completo')} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors">Histórico Completo</button>
            </div>
          </div>
          {loadingDetalhamento ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Buscando dados...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] text-white/50 uppercase font-bold tracking-widest">
                    {isConsolidado ? (
                      <>
                        <th className="p-4 border-b border-white/10">Empresa</th>
                        <th className="p-4 border-b border-white/10 text-right">Valor</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 border-b border-white/10">Data</th>
                        <th className="p-4 border-b border-white/10">Nome</th>
                        <th className="p-4 border-b border-white/10">Descrição</th>
                        <th className="p-4 border-b border-white/10 text-right">Valor</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {detalhamento.length === 0 ? (
                    <tr><td colSpan={isConsolidado ? 2 : 4} className="p-12 text-center text-[11px] text-white/30 italic">Nenhum dado encontrado.</td></tr>
                  ) : (
                    detalhamento.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5">
                        {isConsolidado ? (
                          <>
                            <td className="p-4 text-[11px] text-white/80 font-medium">{item.nome}</td>
                            <td className={`p-4 text-[11px] text-right font-semibold ${(item.valor || 0) < 0 ? 'text-red-400' : 'text-white'}`}>{formatarMoeda(item.valor || 0)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-4 text-[11px] text-white/60 font-mono">{item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="p-4 text-[11px] text-white/80 font-medium">{item.nome || '—'}</td>
                            <td className="p-4 text-[11px] text-white/50 italic">{item.descricao || '—'}</td>
                            <td className={`p-4 text-[11px] text-right font-semibold ${(item.valor || 0) < 0 ? 'text-red-400' : 'text-white'}`}>{formatarMoeda(item.valor || 0)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const matrizGerencialCalculada = gerarDadosGerenciais;

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
              <button onClick={() => setVisao('Mensal')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${visao === 'Mensal' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Mensal</button>
              <button onClick={() => setVisao('Diário')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${visao === 'Diário' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Diário</button>
            </div>
            <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))} className="bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 outline-none focus:border-acelerar-light-blue">
              <option value={2026}>Ano: 2026</option>
            </select>
          </div>
        )}
      </div>
      {!empresaAtiva ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/20 space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-widest">Selecione uma empresa na aba acima para visualizar o DFC.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Processando dados...</p>
            </div>
          ) : dados && matrizGerencialCalculada ? (
            <div className="space-y-12 animate-in fade-in duration-500">
              {renderTabelaMensal(dados.matriz, `DFC REAL - MOVIMENTAÇÕES BANCÁRIAS - ${empresaAtiva}`, dados.saldoInicial)}
              {renderTabelaMensal(matrizGerencialCalculada, `DFC GERENCIAL - CONSIDERANDO OPERAÇÕES INTERCOMPANY - ${empresaAtiva}`, dados.saldoInicial)}
            </div>
          ) : null}
        </div>
      )}
      {renderDetalhamentoModal()}
    </div>
  );
}

export default function DFCPage() {
  return (
    <Suspense fallback={<div className="flex flex-col h-full bg-acelerar-dark-blue p-8 items-center justify-center"><div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div></div>}>
      <DFCContent />
    </Suspense>
  );
}
