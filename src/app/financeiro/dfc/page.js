"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect, Suspense } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  LayoutDashboard, 
  FileText, 
  PieChart, 
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  Search,
  X
} from 'lucide-react';

// Componente para as abas de empresas (Logos apenas)
function EmpresaTab({ nome, logo, isActive, onClick }) {
    const isVMC = nome === 'VMC Tech';
    return (
        <button 
            onClick={onClick}
            className={`relative flex items-center justify-center px-8 py-4 transition-all duration-200 border-b-2 ${
                isActive 
                ? 'border-acelerar-light-blue bg-white/5' 
                : 'border-transparent hover:bg-white/5'
            }`}
        >
            {logo && (
                <div className={`relative ${isVMC ? 'w-40' : 'w-24'} h-14 transition-all duration-200 ${isActive ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'}`}>
                    <Image 
                        src={logo} 
                        alt={nome} 
                        fill
                        className="object-contain"
                    />
                </div>
            )}
        </button>
    );
}

// Função de formatação otimizada (REMOVIDO R$, SUPRIMIDO DECIMAIS PARA >= 1.00)
const formatarMoedaOtimizado = (valor) => {
  if (valor === null || valor === undefined) return "—";
  const absValor = Math.abs(valor);
  
  // Se for entre 0,01 e 0,99, mantém decimais
  // Se for >= 1,00, suprime decimais
  const options = {
    minimumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
    maximumFractionDigits: (absValor > 0 && absValor < 1) ? 2 : 0,
  };

  const formatado = new Intl.NumberFormat('pt-BR', options).format(valor);
  return formatado;
};

function LancamentosTable({ lancamentos, onClose, grupo }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-acelerar-dark-blue border border-white/10 rounded-2xl w-full max-w-5xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Detalhamento de Lançamentos</h3>
            <p className="text-acelerar-light-blue text-sm font-medium mt-1">{grupo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="text-white/70" />
          </button>
        </div>
        
        <div className="overflow-auto flex-1 p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-acelerar-light-blue text-xs uppercase tracking-wider border-b border-white/10">
                <th className="pb-4 font-semibold">Data</th>
                <th className="pb-4 font-semibold">Nome</th>
                <th className="pb-4 font-semibold">Descrição</th>
                <th className="pb-4 font-semibold">Categoria</th>
                <th className="pb-4 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white/70 text-sm">{l.data}</td>
                  <td className="py-3 text-white font-medium text-sm">{l.nome}</td>
                  <td className="py-3 text-white/60 text-sm">{l.descricao}</td>
                  <td className="py-3 text-white/60 text-sm">{l.categoria}</td>
                  <td className={`py-3 text-right font-bold text-sm ${l.valor < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatarMoedaOtimizado(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/5 font-bold">
                <td colSpan="4" className="py-4 px-4 text-white">TOTAL</td>
                <td className={`py-4 px-4 text-right ${lancamentos.reduce((acc, curr) => acc + curr.valor, 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatarMoedaOtimizado(lancamentos.reduce((acc, curr) => acc + curr.valor, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function DFCContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [empresaAtiva, setEmpresaAtiva] = useState('Consolidado');
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear());
  const [detalhamento, setDetalhamento] = useState(null);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);

  const empresas = [
    { nome: 'Consolidado', logo: '/logo_acelerar_login.png' },
    { nome: 'VMC Tech', logo: '/logo_vmctech.png' },
    { nome: 'Victec', logo: '/logo_victec.png' }
  ];

  const anos = [2024, 2025, 2026];

  useEffect(() => {
    fetchDados();
  }, [empresaAtiva, anoAtivo]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/dfc?empresa=${empresaAtiva}&ano=${anoAtivo}`);
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error("Erro ao buscar DFC:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhamento = async (grupo, mesIndex) => {
    setLoadingDetalhamento(true);
    try {
      const res = await fetch(`/api/financeiro/dfc/detalhamento?empresa=${empresaAtiva}&ano=${anoAtivo}&mes=${mesIndex + 1}&grupo=${encodeURIComponent(grupo)}`);
      const data = await res.json();
      setDetalhamento({ grupo, lancamentos: data });
    } catch (error) {
      console.error("Erro ao buscar detalhamento:", error);
    } finally {
      setLoadingDetalhamento(false);
    }
  };

  const renderTabelaMensal = () => {
    if (!dados || !dados.matriz) return null;

    // Lógica de cálculo em cascata dos saldos
    let saldoAcumulado = dados.saldoInicial || 0;
    const linhaSaldoInicial = { label: 'SALDO INICIAL', valores: [] };
    const linhaSaldoOperacional = { label: '(=) SALDO OPERACIONAL LÍQUIDO', valores: [] };
    const linhaSaldoFinal = { label: '(=) SALDO LÍQUIDO DO PERÍODO', valores: [] };

    const linhaResultadoNibo = dados.matriz.find(l => l.key === '(=) SALDO LÍQUIDO DO PERÍODO');

    if (linhaResultadoNibo) {
      linhaResultadoNibo.valores.forEach((valorMes) => {
        linhaSaldoInicial.valores.push(saldoAcumulado);
        linhaSaldoOperacional.valores.push(valorMes);
        const novoSaldoFinal = saldoAcumulado + valorMes;
        linhaSaldoFinal.valores.push(novoSaldoFinal);
        saldoAcumulado = novoSaldoFinal;
      });
    }

    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PieChart className="text-acelerar-light-blue w-5 h-5" />
            Demonstrativo de Fluxo de Caixa (DFC) - {anoAtivo}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-acelerar-dark-blue/50 text-acelerar-light-blue text-xs uppercase tracking-wider border-b border-white/10">
                <th className="p-4 font-bold sticky left-0 bg-acelerar-dark-blue z-10 min-w-[250px]">Descrição</th>
                {dados.meses.map(mes => (
                  <th key={mes} className="p-4 text-center font-bold min-w-[100px]">{mes}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* LINHA: SALDO INICIAL */}
              <tr className="bg-acelerar-light-blue/10 font-bold border-b border-white/10">
                <td className="p-4 sticky left-0 bg-acelerar-dark-blue/90 z-10 text-acelerar-light-blue">SALDO INICIAL</td>
                {linhaSaldoInicial.valores.map((v, i) => (
                  <td key={i} className="p-4 text-right text-white">{formatarMoedaOtimizado(v)}</td>
                ))}
              </tr>

              {dados.matriz.map((linha, idx) => {
                // Pula a linha de saldo original do NIBO para não duplicar
                if (linha.key === '(=) SALDO LÍQUIDO DO PERÍODO') return null;

                const isCalculado = linha.tipo === 'calculado';
                return (
                  <tr 
                    key={idx} 
                    className={`border-b border-white/5 transition-colors hover:bg-white/5 ${isCalculado ? 'bg-white/5 font-bold' : ''}`}
                  >
                    <td className={`p-4 sticky left-0 z-10 ${isCalculado ? 'bg-acelerar-dark-blue/90 text-acelerar-light-blue' : 'bg-acelerar-dark-blue text-white/80'}`}>
                      {linha.label}
                    </td>
                    {linha.valores.map((v, i) => (
                      <td 
                        key={i} 
                        onClick={() => !isCalculado && v !== 0 && handleVerDetalhamento(linha.key, i)}
                        className={`p-4 text-right cursor-pointer hover:text-acelerar-light-blue transition-colors ${v < 0 ? 'text-red-400' : v > 0 ? 'text-emerald-400' : 'text-white/30'}`}
                      >
                        {formatarMoedaOtimizado(v)}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* LINHA: SALDO OPERACIONAL LÍQUIDO */}
              <tr className="bg-white/10 font-bold border-t-2 border-white/20">
                <td className="p-4 sticky left-0 bg-acelerar-dark-blue/90 z-10 text-acelerar-light-blue">(=) SALDO OPERACIONAL LÍQUIDO</td>
                {linhaSaldoOperacional.valores.map((v, i) => (
                  <td key={i} className={`p-4 text-right ${v < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatarMoedaOtimizado(v)}
                  </td>
                ))}
              </tr>

              {/* LINHA: SALDO LÍQUIDO DO PERÍODO (FINAL) */}
              <tr className="bg-acelerar-light-blue/20 font-black border-t border-white/10">
                <td className="p-4 sticky left-0 bg-acelerar-dark-blue/90 z-10 text-white uppercase">(=) SALDO LÍQUIDO DO PERÍODO</td>
                {linhaSaldoFinal.valores.map((v, i) => (
                  <td key={i} className={`p-4 text-right ${v < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatarMoedaOtimizado(v)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
            <div className="cursor-pointer transition-transform hover:scale-105" onClick={() => router.push('/dashboard')}>
              <Image src="/logo_acelerar_login.png" alt="Acelerar.tech" width={150} height={40} className="object-contain" />
            </div>
            <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all">
                <LayoutDashboard size={18} /> Dashboard
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-acelerar-light-blue text-acelerar-dark-blue shadow-lg shadow-acelerar-light-blue/20">
                <FileText size={18} /> DFC
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <Calendar className="text-acelerar-light-blue w-4 h-4" />
              <select 
                value={anoAtivo} 
                onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              >
                {anos.map(ano => <option key={ano} value={ano} className="bg-acelerar-dark-blue">{ano}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
        {/* Seletor de Empresas */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 mb-8 overflow-x-auto no-scrollbar">
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-acelerar-light-blue/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-acelerar-light-blue rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="mt-6 text-acelerar-light-blue font-medium animate-pulse">Consolidando dados financeiros...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderTabelaMensal()}
          </div>
        )}
      </main>

      {/* Modais */}
      {detalhamento && (
        <LancamentosTable 
          lancamentos={detalhamento.lancamentos} 
          grupo={detalhamento.grupo}
          onClose={() => setDetalhamento(null)} 
        />
      )}

      {loadingDetalhamento && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-acelerar-dark-blue p-8 rounded-2xl border border-white/10 shadow-2xl text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-acelerar-light-blue mb-4" />
            <p className="text-white font-medium">Buscando detalhes no NIBO...</p>
          </div>
        </div>
      )}
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
