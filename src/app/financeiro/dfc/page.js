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

  // FUNÇÃO DE FORMATAÇÃO OTIMIZADA
  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return '0';
    const absValor = Math.abs(valor);
    
    // Se for entre 0,01 e 0,99, mantém decimais. Se for >= 1,00, suprime decimais.
    const options = {
      minimumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
      maximumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
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
          <tbody className="text-[11px]">
            {matrizFinal.map((linha) => {
              const isTotal = linha.key.startsWith('(=)') || linha.key === 'SALDO_INICIAL';
              return (
                <tr key={linha.key} className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}>
                  <td className={`p-4 ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha.label}</td>
                  {linha.valores.map((valor, mIdx) => {
                    const isSelecionada = selecionado.mesIdx === mIdx && selecionado.grupoKey === linha.key;
                    // Apenas linhas que não são de saldo podem ser clicadas para detalhamento
                    const podeClicar = !isTotal || linha.key.startsWith('(=)') && !linha.key.includes('SALDO');
                    
                    return (
                      <td key={mIdx} className="p-0 relative group">
                        <button
                          onClick={() => podeClicar && carregarDetalhamento(mIdx, linha.key, linha.label)}
                          disabled={!podeClicar}
                          className={`w-full h-full p-4 text-right transition-all duration-150 focus:outline-none
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
              <tbody className="text-[11px]">
                {detalhamento.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-xs text-white/30 italic">
                      Nenhum lançamento encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  detalhamento.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5">
                      <td className="p-4 text-white/60 font-mono">
                        {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="p-4 text-white font-medium">{item.nome || '—'}</td>
                      <td className="p-4 text-white/50 italic">{item.descricao || '—'}</td>
                      <td className="p-4">
                        <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          {item.categoria || '—'}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-semibold ${(item.valor || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatarMoeda(item.valor || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-acelerar-dark-blue text-white font-sans selection:bg-acelerar-light-blue/30">
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-acelerar-light-blue/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-acelerar-light-blue/10 blur-[120px] rounded-full" />
      </div>

      {/* Marca d'água da Acelerar */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0">
        <Image 
          src="/marca-dagua-acelerar.webp" 
          alt="Watermark" 
          width={800} 
          height={800} 
          className="object-contain"
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-acelerar-dark-blue/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="cursor-pointer transition-transform hover:scale-105" onClick={() => (window.location.href = '/dashboard')}>
              <Image src="/logo_acelerar_login.png" alt="Acelerar.tech" width={150} height={40} className="object-contain" />
            </div>
            <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => (window.location.href = '/dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all">
                Dashboard
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-acelerar-light-blue text-acelerar-dark-blue shadow-lg shadow-acelerar-light-blue/20">
                DFC
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <select 
                value={anoAtivo} 
                onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026].map(ano => <option key={ano} value={ano} className="bg-acelerar-dark-blue">{ano}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
        {/* Seletor de Empresas */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 mb-8 overflow-x-auto no-scrollbar">
          {[
            { nome: 'Consolidado', logo: '/logo_acelerar_login.png' },
            { nome: 'VMC Tech', logo: '/logo_vmctech.png' },
            { nome: 'Victec', logo: '/logo_victec.png' }
          ].map((emp) => (
            <EmpresaTab
              key={emp.nome}
              nome={emp.nome}
              logo={emp.logo}
              isActive={empresaAtiva === emp.nome}
              onClick={() => setEmpresaAtiva(emp.nome)}
            />
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-acelerar-light-blue font-medium animate-pulse uppercase tracking-widest text-xs">Consolidando dados financeiros...</p>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderTabelaMensal()}
            {renderDetalhamento()}
          </div>
        )}
      </main>
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
