"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

// Componente auxiliar para logos de empresas
const EmpresaTab = ({ nome, ativo, onClick }) => {
  const logos = {
    Victec: "/images/logos/victec-logo.png",
    "VMC Tech": "/images/logos/vmctech-logo.png",
    Consolidado: "/images/logos/consolidado-logo.png",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 rounded-t-lg transition-all ${
        ativo
          ? "bg-[#1e293b] text-white border-t-2 border-acelerar-light-blue"
          : "bg-transparent text-slate-400 hover:bg-slate-800/50"
      }`}
    >
      <div className="relative w-8 h-8">
        <Image
          src={logos[nome] || logos.Victec}
          alt={nome}
          fill
          className="object-contain"
        />
      </div>
      <span className="font-semibold uppercase tracking-wider text-sm">
        {nome}
      </span>
    </button>
  );
};

function DFCContent() {
  const searchParams = useSearchParams();
  const [empresa, setEmpresa] = useState("Victec");
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [visao, setVisao] = useState("mensal");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados para Detalhamento
  const [detalhamento, setDetalhamento] = useState([]);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  const carregarDados = async () => {
    setLoading(true);
    setDetalhamento([]);
    setSelecionado(null);
    try {
      const res = await fetch(
        `/api/financeiro/dfc?empresa=${empresa}&ano=${ano}`
      );
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error("Erro ao carregar DFC:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhamento = async (grupoKey, mesIdx, label) => {
    setLoadingDetalhamento(true);
    setSelecionado({ grupoKey, mesIdx, label });
    try {
      const mes = mesIdx + 1;
      const res = await fetch(
        `/api/financeiro/dfc/detalhamento?empresa=${empresa}&ano=${ano}&mes=${mes}&grupo=${grupoKey}`
      );
      const data = await res.json();
      setDetalhamento(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar detalhamento:", error);
      setDetalhamento([]);
    } finally {
      setLoadingDetalhamento(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [empresa, ano]);

  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const renderTabelaMensal = () => {
    if (!dados?.matriz) return null;

    return (
      <div className="overflow-x-auto custom-scrollbar pb-4">
        <table className="w-full text-sm text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="sticky left-0 z-10 bg-[#0f172a] p-4 font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 min-w-[280px]">
                Categoria
              </th>
              {dados.meses.map((m) => (
                <th
                  key={m}
                  className="p-4 font-bold text-slate-400 text-center uppercase tracking-wider border-b border-slate-700 min-w-[120px]"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {dados.matriz.map((linha, idx) => {
              const isTotal = linha.tipo === "calculado";
              const isNegative = linha.label.startsWith("(-)");

              return (
                <tr
                  key={linha.key}
                  className={`group transition-colors ${
                    isTotal ? "bg-slate-800/30 font-bold" : "hover:bg-slate-800/20"
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 p-4 border-b border-slate-800/50 whitespace-nowrap ${
                      isTotal
                        ? "bg-[#1e293b] text-acelerar-light-blue"
                        : "bg-[#0f172a] text-slate-300"
                    }`}
                  >
                    {linha.label}
                  </td>
                  {linha.valores.map((valor, mIdx) => {
                    const isSelected =
                      selecionado?.grupoKey === linha.key &&
                      selecionado?.mesIdx === mIdx;

                    return (
                      <td
                        key={mIdx}
                        className={`p-0 border-b border-slate-800/50 text-right`}
                      >
                        {isTotal ? (
                          <div className="p-3">
                            <span
                              className={
                                valor < 0 ? "text-red-400" : "text-white"
                              }
                            >
                              {formatarMoeda(valor)}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              carregarDetalhamento(linha.key, mIdx, linha.label)
                            }
                            title="Exibir detalhamento"
                            className={`w-full p-3 text-right transition-all outline-none ${
                              isSelected
                                ? "ring-2 ring-inset ring-acelerar-light-blue bg-acelerar-light-blue/10"
                                : "hover:bg-acelerar-light-blue/5"
                            }`}
                          >
                            <span
                              className={
                                valor < 0 ? "text-red-400" : "text-slate-400"
                              }
                            >
                              {formatarMoeda(valor)}
                            </span>
                          </button>
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
    if (!selecionado) return null;

    return (
      <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-8 bg-acelerar-yellow rounded-full"></div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Detalhamento dos Lançamentos
          </h2>
          <span className="px-4 py-1 rounded-full bg-slate-800 text-slate-400 text-sm font-medium border border-slate-700">
            {selecionado.label} • {dados.meses[selecionado.mesIdx]}/
            {dados.ano}
          </span>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700">
                  <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-right">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loadingDetalhamento ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-slate-400 font-medium">
                          Buscando lançamentos no NIBO...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : detalhamento.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500 italic">
                      Nenhum lançamento encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  detalhamento.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="p-4 text-slate-400 whitespace-nowrap">
                        {item.data ? (
                          new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4 text-white font-medium max-w-[300px] truncate">
                        {item.nome}
                      </td>
                      <td className="p-4 text-slate-400 italic max-w-[250px] truncate">
                        {item.descricao}
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-xs">
                          {item.categoria}
                        </span>
                      </td>
                      <td
                        className={`p-4 text-right font-bold ${
                          item.valor < 0 ? "text-red-400" : "text-acelerar-light-blue"
                        }`}
                      >
                        {formatarMoeda(item.valor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loadingDetalhamento && detalhamento.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-800/50 border-t border-slate-700">
                    <td
                      colSpan="4"
                      className="p-4 text-right font-bold text-slate-400 uppercase"
                    >
                      Total
                    </td>
                    <td
                      className={`p-4 text-right font-bold text-lg ${
                        detalhamento.reduce((acc, i) => acc + i.valor, 0) < 0
                          ? "text-red-400"
                          : "text-white"
                      }`}
                    >
                      {formatarMoeda(
                        detalhamento.reduce((acc, i) => acc + i.valor, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Cabeçalho e Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Demonstrativo de Fluxo de Caixa - {empresa}
            </h1>
            <p className="text-slate-400">
              Análise financeira detalhada por regime de caixa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-800/40 p-2 rounded-xl border border-slate-700/50">
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:ring-2 focus:ring-acelerar-light-blue outline-none transition-all"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>

            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setVisao("mensal")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  visao === "mensal"
                    ? "bg-acelerar-light-blue text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setVisao("diario")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  visao === "diario"
                    ? "bg-acelerar-light-blue text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Diário
              </button>
            </div>

            <button
              onClick={carregarDados}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-acelerar-light-blue"
              title="Atualizar dados"
            >
              <svg
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Abas de Empresas */}
        <div className="flex border-b border-slate-700 mb-6">
          {["Victec", "VMC Tech", "Consolidado"].map((nome) => (
            <EmpresaTab
              key={nome}
              nome={nome}
              ativo={empresa === nome}
              onClick={() => setEmpresa(nome)}
            />
          ))}
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px]">
          {loading && !dados ? (
            <div className="flex flex-col items-center justify-center h-[600px] gap-4">
              <div className="w-16 h-16 border-4 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-medium animate-pulse">
                Consolidando dados financeiros...
              </p>
            </div>
          ) : !dados ? (
            <div className="flex flex-col items-center justify-center h-[600px] text-slate-500">
              <svg
                className="w-16 h-16 mb-4 opacity-20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Selecione uma empresa para visualizar o DFC</p>
            </div>
          ) : (
            renderTabelaMensal()
          )}
        </div>

        {/* Detalhamento */}
        {renderDetalhamento()}
      </div>
    </div>
  );
}

export default function DFCPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <DFCContent />
    </Suspense>
  );
}
