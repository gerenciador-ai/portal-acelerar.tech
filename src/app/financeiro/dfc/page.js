"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

const LINHAS_DFC = [
  "RECEITAS OPERACIONAIS",
  "(-) IMPOSTOS SOBRE VENDAS",
  "(=) RECEITA LÍQUIDA",
  "(-) CUSTOS OPERACIONAIS",
  "(-) DESPESAS ADMINISTRATIVAS",
  "(-) DESPESAS COMERCIAIS",
  "(=) FLUXO OPERACIONAL (FCO)",
  "(+/-) FLUXO DE INVESTIMENTO (FCI)",
  "(+/-) FLUXO DE FINANCIAMENTO (FCF)",
  "(-) DESPESAS FINANCEIRAS",
  "OUTROS / NÃO CLASSIFICADOS",
  "(=) SALDO LÍQUIDO DO PERÍODO"
];

// Linhas calculadas (não vêm direto da API, são derivadas)
const LINHAS_CALCULADAS = new Set([
  "(=) RECEITA LÍQUIDA",
  "(=) FLUXO OPERACIONAL (FCO)",
  "(=) SALDO LÍQUIDO DO PERÍODO"
]);

function EmpresaTab({ nome, logo, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 border-b-2 ${
        isActive
          ? 'border-acelerar-light-blue bg-white/5 text-white'
          : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'
      }`}
    >
      {logo && (
        <Image
          src={logo}
          alt={nome}
          width={24}
          height={24}
          className={isActive ? 'opacity-100' : 'opacity-40'}
        />
      )}
      <span className="text-sm font-medium uppercase tracking-wider">{nome}</span>
    </button>
  );
}

export default function DFCPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visao, setVisao] = useState('Mensal');
  const [anoAtivo, setAnoAtivo] = useState(2026);

  useEffect(() => {
    if (empresaAtiva && empresaAtiva !== 'Consolidado') {
      carregarDados();
    }
  }, [empresaAtiva, anoAtivo]);

  const carregarDados = async () => {
    setLoading(true);
    setDados(null);
    try {
      const res = await fetch(`/api/financeiro/dfc?empresa=${empresaAtiva}&ano=${anoAtivo}`);
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error('Erro ao carregar DFC:', error);
    } finally {
      setLoading(false);
    }
  };

  // Constrói a matriz final com linhas calculadas
  const matrizFinal = useMemo(() => {
    if (!dados || !dados.matriz) return null;

    const m = {};

    // Inicializar todas as linhas com zeros
    LINHAS_DFC.forEach(linha => {
      m[linha] = Array(12).fill(0);
    });

    // Copiar valores vindos da API
    for (const [grupo, valores] of Object.entries(dados.matriz)) {
      if (m[grupo]) {
        for (let i = 0; i < 12; i++) {
          m[grupo][i] = valores[i] || 0;
        }
      } else {
        // Grupo não mapeado vai para OUTROS / NÃO CLASSIFICADOS
        for (let i = 0; i < 12; i++) {
          m["OUTROS / NÃO CLASSIFICADOS"][i] += valores[i] || 0;
        }
      }
    }

    // Calcular linhas derivadas
    for (let i = 0; i < 12; i++) {
      m["(=) RECEITA LÍQUIDA"][i] =
        m["RECEITAS OPERACIONAIS"][i] +
        m["(-) IMPOSTOS SOBRE VENDAS"][i];

      m["(=) FLUXO OPERACIONAL (FCO)"][i] =
        m["(=) RECEITA LÍQUIDA"][i] +
        m["(-) CUSTOS OPERACIONAIS"][i] +
        m["(-) DESPESAS ADMINISTRATIVAS"][i] +
        m["(-) DESPESAS COMERCIAIS"][i];

      m["(=) SALDO LÍQUIDO DO PERÍODO"][i] =
        m["(=) FLUXO OPERACIONAL (FCO)"][i] +
        m["(+/-) FLUXO DE INVESTIMENTO (FCI)"][i] +
        m["(+/-) FLUXO DE FINANCIAMENTO (FCF)"][i] +
        m["(-) DESPESAS FINANCEIRAS"][i] +
        m["OUTROS / NÃO CLASSIFICADOS"][i];
    }

    return m;
  }, [dados]);

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(valor);

  const renderTabelaMensal = () => {
    if (!matrizFinal) return null;
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50 backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] text-white/50 uppercase font-bold tracking-widest">
              <th className="p-4 border-b border-white/10">Categoria</th>
              {meses.map(m => (
                <th key={m} className="p-4 border-b border-white/10 text-right">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS_DFC.map((linha) => {
              const isTotal = LINHAS_CALCULADAS.has(linha);
              const valores = matrizFinal[linha] || Array(12).fill(0);
              return (
                <tr
                  key={linha}
                  className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}
                >
                  <td className={`p-4 text-sm ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>
                    {linha}
                  </td>
                  {valores.map((valor, mIdx) => (
                    <td
                      key={mIdx}
                      className={`p-4 text-sm text-right ${valor < 0 ? 'text-red-400' : 'text-white'}`}
                    >
                      {formatarMoeda(valor)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-acelerar-dark-blue p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-white/10">
        <div className="flex">
          <EmpresaTab
            nome="Consolidado"
            logo="/logo_acelerar_login.png"
            isActive={empresaAtiva === 'Consolidado'}
            onClick={() => setEmpresaAtiva('Consolidado')}
          />
          <EmpresaTab
            nome="VMC Tech"
            logo="/logo_vmctech.png"
            isActive={empresaAtiva === 'VMC Tech'}
            onClick={() => setEmpresaAtiva('VMC Tech')}
          />
          <EmpresaTab
            nome="Victec"
            logo="/logo_victec.png"
            isActive={empresaAtiva === 'Victec'}
            onClick={() => setEmpresaAtiva('Victec')}
          />
        </div>
        {empresaAtiva && (
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setVisao('Mensal')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  visao === 'Mensal'
                    ? 'bg-acelerar-light-blue text-white shadow-lg'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setVisao('Diário')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  visao === 'Diário'
                    ? 'bg-acelerar-light-blue text-white shadow-lg'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Diário
              </button>
            </div>
            <select
              value={anoAtivo}
              onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
              className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-acelerar-light-blue"
            >
              <option value={2026}>Ano: 2026</option>
            </select>
          </div>
        )}
      </div>

      {!empresaAtiva ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/20 space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest">
            Selecione uma empresa na aba acima para visualizar o DFC.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest">
                Processando dados do Nibo via Supabase...
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-acelerar-light-blue rounded-full"></span>
                Demonstrativo de Fluxo de Caixa - {empresaAtiva}
              </h3>
              {renderTabelaMensal()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
