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
    const rateioRecebidoIntercompanyConsolidado = new Array(12).fill(0);

    Object.values(cache).forEach(empresaData => {
      empresaData.recuperacaoIntercompany?.forEach((v, i) => {
        recuperacaoIntercompanyConsolidada[i] += (v || 0);
      });
      empresaData.rateioRecebidoIntercompany?.forEach((v, i) => {
        rateioRecebidoIntercompanyConsolidado[i] += (v || 0);
      });
    });

    return {
      ...primeiraEmpresa,
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

  const gerarDadosGerenciais = useMemo(() => {
    if (!dados || !dados.matriz) return null;
    const matrizReal = dados.matriz;
    const recuperacaoIntercompany = dados.recuperacaoIntercompany || new Array(12).fill(0);
    const rateioRecebidoIntercompany = dados.rateioRecebidoIntercompany || new Array(12).fill(0);
    const meses = dados.meses || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    const LINHAS_DFC_GERENCIAL = [
      { key: "RECEITAS OPERACIONAIS", label: "RECEITAS OPERACIONAIS", tipo: "linha" },
      { key: "(-) IMPOSTOS SOBRE VENDAS", label: "(-) IMPOSTOS SOBRE VENDAS", tipo: "linha" },
      { key: "(=) RECEITA LÍQUIDA", label: "(=) RECEITA LÍQUIDA", tipo: "calculado" },
      { key: "(-) CUSTOS OPERACIONAIS", label: "(-) CUSTOS OPERACIONAIS", tipo: "linha" },
      { key: "(-) DESPESAS ADMINISTRATIVAS", label: "(-) DESPESAS ADMINISTRATIVAS", tipo: "linha" },
      { key: "(-) DESPESAS COMERCIAIS", label: "(-) DESPESAS COMERCIAIS", tipo: "linha" },
      { key: "(=) FLUXO OPERACIONAL (FCO)", label: "(=) FLUXO OPERACIONAL (FCO)", tipo: "calculado" },
      { key: "(-) RECUPERAÇÃO INTERCOMPANY", label: "(-) RECUPERAÇÃO INTERCOMPANY", tipo: "linha" },
      { key: "(+) RATEIO RECEBIDO INTERCOMPANY", label: "(+) RATEIO RECEBIDO INTERCOMPANY", tipo: "linha" },
      { key: "(=) FLUXO OPERACIONAL GERENCIAL (FCO)", label: "(=) FLUXO OPERACIONAL GERENCIAL (FCO)", tipo: "calculado" },
      { key: "(+/-) FLUXO DE INVESTIMENTO (FCI)", label: "(+/-) FLUXO DE INVESTIMENTO (FCI)", tipo: "linha" },
      { key: "(-) DESPESAS FINANCEIRAS", label: "(-) DESPESAS FINANCEIRAS", tipo: "linha" },
      { key: "OUTROS / NÃO CLASSIFICADOS", label: "OUTROS / NÃO CLASSIFICADOS", tipo: "linha" },
      { key: "(=) SALDO LÍQUIDO DO PERÍODO", label: "(=) SALDO LÍQUIDO DO PERÍODO", tipo: "calculado" },
    ];

    const matrizGerencial = LINHAS_DFC_GERENCIAL.map(linha => {
      const valores = meses.map((_, mIdx) => {
        if (linha.tipo === "calculado") return null;
        if (linha.key === "(-) RECUPERAÇÃO INTERCOMPANY") return -recuperacaoIntercompany[mIdx];
        if (linha.key === "(+) RATEIO RECEBIDO INTERCOMPANY") return rateioRecebidoIntercompany[mIdx];
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
      
      const fco = recLiq + get("(-) CUSTOS OPERACIONAIS") + get("(-) DESPESAS ADMINISTRATIVAS") + get("(-) DESPESAS COMERCIAIS") + get("(-) RECUPERAÇÃO INTERCOMPANY") + get("(+) RATEIO RECEBIDO INTERCOMPANY");
      set("(=) FLUXO OPERACIONAL GERENCIAL (FCO)", fco);
      
      const saldo = fco + get("(+/-) FLUXO DE INVESTIMENTO (FCI)") + get("(-) DESPESAS FINANCEIRAS") + get("OUTROS / NÃO CLASSIFICADOS");
      set("(=) SALDO LÍQUIDO DO PERÍODO", saldo);
    }

    let saldoInicialGerencial = dados.saldoInicial;
    const saldosFinaisGerenciais = [];

    for (let m = 0; m < 12; m++) {
      const saldoLiquidoPeriodo = matrizGerencial.find(r => r.key === "(=) SALDO LÍQUIDO DO PERÍODO").valores[m];
      saldosFinaisGerenciais[m] = saldoInicialGerencial + saldoLiquidoPeriodo;
      saldoInicialGerencial = saldosFinaisGerenciais[m];
    }

    return { matriz: matrizGerencial, saldosFinais: saldosFinaisGerenciais };
  }, [dados]);

  const renderTabelaDFC = (dfcData, isGerencial = false) => {
    if (!dfcData || !dfcData.matriz) return null;

    const { matriz, saldosFinais } = dfcData;
    const saldoInicial = isGerencial ? (dfcData.saldoInicial || 0) : dados.saldoInicial;

    let saldoAcumulado = saldoInicial;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-white border-collapse">
          <thead>
            <tr className="bg-acelerar-dark-blue-light">
              <th className="px-2 py-1 text-left text-[9px] font-medium text-white/70 uppercase tracking-wider border-b border-white/10">CATEGORIA</th>
              {dados.meses.map((mes, idx) => (
                <th key={idx} className="px-2 py-1 text-right text-[9px] font-medium text-white/70 uppercase tracking-wider border-b border-white/10">{mes}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            <tr className="bg-acelerar-dark-blue">
              <td className="px-2 py-1 text-left text-[11px] font-medium">SALDO INICIAL</td>
              {dados.meses.map((mes, idx) => {
                const valor = (idx === 0 ? saldoInicial : saldosFinais[idx - 1]) || 0;
                return (
                  <td key={idx} className={`px-2 py-1 text-right text-[11px] font-medium ${valor < 0 ? 'text-red-500' : ''}`}>
                    {formatarMoeda(valor)}
                  </td>
                );
              })}
            </tr>
            {matriz.map((linha, linhaIdx) => {
              const isCalculado = linha.tipo === 'calculado';
              const isFCO = linha.key.includes('FLUXO OPERACIONAL');
              const isSaldoLiquido = linha.key.includes('SALDO LÍQUIDO');
              const isFCF = linha.key.includes('FLUXO DE FINANCIAMENTO');

              if (isGerencial && isFCF) return null; // Remove FCF do DFC Gerencial

              return (
                <tr key={linhaIdx} className={`${isCalculado ? 'bg-white/5 font-semibold' : 'bg-acelerar-dark-blue'} hover:bg-white/10`}>
                  <td className={`px-2 py-1 text-left text-[11px] ${isCalculado ? 'font-semibold' : ''}`}>
                    {linha.label}
                  </td>
                  {linha.valores.map((valor, colIdx) => {
                    const displayValue = isCalculado ? (isFCO || isSaldoLiquido ? valor : null) : valor;
                    const cellValue = displayValue !== null ? displayValue : 0;
                    return (
                      <td 
                        key={colIdx} 
                        className={`px-2 py-1 text-right text-[11px] ${isCalculado ? 'font-semibold' : ''} ${cellValue < 0 ? 'text-red-500' : ''} ${isCalculado && !isFCO && !isSaldoLiquido ? 'text-white/50' : ''}`}
                        onClick={() => {
                          if (!isCalculado && !isGerencial) {
                            carregarDetalhamento(colIdx, linha.key, linha.label);
                          }
                        }}
                      >
                        {displayValue !== null ? formatarMoeda(displayValue) : '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="bg-white/5 font-semibold">
              <td className="px-2 py-1 text-left text-[11px]">SALDO FINAL</td>
              {saldosFinais.map((valor, idx) => (
                <td key={idx} className={`px-2 py-1 text-right text-[11px] ${valor < 0 ? 'text-red-500' : ''}`}>
                  {formatarMoeda(valor)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const dfcGerencial = gerarDadosGerenciais;

  return (
    <div className="flex flex-col h-full bg-acelerar-dark-blue text-white">
      <div className="flex-shrink-0 bg-acelerar-dark-blue-light border-b border-white/10">
        <div className="flex justify-start items-center space-x-2 p-2">
          {empresas.map((emp) => (
            <EmpresaTab
              key={emp.nome}
              nome={emp.nome}
              logo={emp.logo}
              isActive={empresaAtiva === emp.nome}
              onClick={() => setEmpresaAtiva(emp.nome)}
            />
          ))}
          <EmpresaTab
            nome="Consolidado"
            logo="/logo_acelerar_sidebar.png"
            isActive={empresaAtiva === 'Consolidado'}
            onClick={() => setEmpresaAtiva('Consolidado')}
          />
        </div>
        <div className="flex items-center justify-between p-2 border-t border-white/10">
          <div className="flex items-center space-x-2">
            <label htmlFor="anoSelect" className="text-[11px] text-white/70">Ano:</label>
            <select
              id="anoSelect"
              className="bg-acelerar-dark-blue border border-white/10 text-white text-[11px] rounded-md px-2 py-1 focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
              value={anoAtivo}
              onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={`px-3 py-1 rounded-md text-[11px] ${visao === 'Mensal' ? 'bg-acelerar-light-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              onClick={() => setVisao('Mensal')}
            >
              Mensal
            </button>
            <button
              className={`px-3 py-1 rounded-md text-[11px] ${visao === 'Acumulado' ? 'bg-acelerar-light-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              onClick={() => setVisao('Acumulado')}
            >
              Acumulado
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full text-white/70">
            <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Carregando DFC...
          </div>
        )}

        {!loading && dados && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-white">DFC REAL - {empresaAtiva}</h2>
              {renderTabelaDFC({ matriz: dados.matriz, saldosFinais: gerarSaldosFinais(dados.matriz, dados.saldoInicial) })}
            </div>

            {dfcGerencial && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-white">DFC GERENCIAL - {empresaAtiva}</h2>
                {renderTabelaDFC(dfcGerencial, true)}
              </div>
            )}
          </div>
        )}

        {!loading && !dados && empresaAtiva && (
          <div className="flex items-center justify-center h-full text-white/70">
            Nenhum dado encontrado para {empresaAtiva} em {anoAtivo}.
          </div>
        )}

        {!loading && !empresaAtiva && (
          <div className="flex items-center justify-center h-full text-white/70">
            Selecione uma empresa para visualizar o DFC.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Detalhes de ${selecionado.grupoLabel} - ${dados?.meses[selecionado.mesIdx]} ${anoAtivo}`}>
        {loadingDetalhamento ? (
          <div className="flex items-center justify-center h-32 text-white/70">
            <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Carregando detalhamento...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end space-x-2">
              <button onClick={() => exportarExcel('exibicao')} className="px-4 py-2 bg-green-600 text-white text-[11px] rounded-md hover:bg-green-700 transition-colors">
                Exportar Exibição (Excel)
              </button>
              <button onClick={() => exportarExcel('completo')} className="px-4 py-2 bg-blue-600 text-white text-[11px] rounded-md hover:bg-blue-700 transition-colors">
                Exportar Histórico Completo (Excel)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-white border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-2 py-1 text-left text-[9px] font-medium text-white/70 uppercase tracking-wider border-b border-white/10">Data</th>
                    <th className="px-2 py-1 text-left text-[9px] font-medium text-white/70 uppercase tracking-wider border-b border-white/10">Descrição</th>
                    <th className="px-2 py-1 text-left text-[9px] font-medium text-white/70 uppercase tracking-wider border-b border-white/10">Categoria</th>
                    <th className="px-2 py-1 text-right text-[9px] font-medium text-white/70 uppercase tracking-wider border-b border-white/10">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {detalhamento.length > 0 ? (
                    detalhamento.map((item, idx) => (
                      <tr key={idx} className="bg-acelerar-dark-blue hover:bg-white/10">
                        <td className="px-2 py-1 text-left text-[11px]">{item.date}</td>
                        <td className="px-2 py-1 text-left text-[11px]">{item.description}</td>
                        <td className="px-2 py-1 text-left text-[11px]">{item.category}</td>
                        <td className={`px-2 py-1 text-right text-[11px] ${item.value < 0 ? 'text-red-500' : ''}`}>{formatarMoeda(item.value)}</td>
                      </tr>
                    ))
                  ) : (selecionado.grupoKey === '(=) SALDO LÍQUIDO DO PERÍODO' || selecionado.grupoKey === '(=) FLUXO OPERACIONAL (FCO)' || selecionado.grupoKey === '(=) RECEITA LÍQUIDA') ? (
                    <tr>
                      <td colSpan="4" className="px-2 py-4 text-center text-[11px] text-white/70">Linhas calculadas não possuem detalhamento direto.</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-2 py-4 text-center text-[11px] text-white/70">Nenhum lançamento encontrado para este grupo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const gerarSaldosFinais = (matriz, saldoInicial) => {
  const saldosFinais = [];
  let saldoAcumulado = saldoInicial;
  for (let m = 0; m < 12; m++) {
    const saldoLiquidoPeriodo = matriz.find(r => r.key === "(=) SALDO LÍQUIDO DO PERÍODO").valores[m];
    saldoAcumulado += saldoLiquidoPeriodo;
    saldosFinais[m] = saldoAcumulado;
  }
  return saldosFinais;
};

export default function DFC() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <DFCContent />
    </Suspense>
  );
}
