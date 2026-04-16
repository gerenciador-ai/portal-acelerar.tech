"use client";
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';

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
            {logo && <Image src={logo} alt={nome} width={24} height={24} className={isActive ? 'opacity-100' : 'opacity-40'} />}
            <span className="text-sm font-medium uppercase tracking-wider">{nome}</span>
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
        if (valor === null || valor === undefined) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(valor);
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
            // IMPORTANTE: Enviamos o grupoKey (chave técnica) para a API bater com o banco
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
                        {dados.matriz.map((linha) => {
                            const isTotal = linha.key.startsWith('(=)');
                            return (
                                <tr key={linha.key} className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}>
                                    <td className={`p-4 text-sm ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha.label}</td>
                                    {linha.valores.map((valor, mIdx) => {
                                        const isSelecionada = selecionado.mesIdx === mIdx && selecionado.grupoKey === linha.key;
                                        return (
                                            <td key={mIdx} className="p-0 relative group">
                                                <button
                                                    onClick={() => carregarDetalhamento(mIdx, linha.key, linha.label)}
                                                    className={`w-full h-full p-4 text-sm text-right transition-all duration-150 focus:outline-none
                                                        ${(valor || 0) < 0 ? 'text-red-400' : 'text-white'}
                                                        ${isSelecionada ? 'ring-2 ring-inset ring-acelerar-light-blue bg-acelerar-light-blue/10' : 'hover:bg-white/5'}
                                                    `}
                                                >
                                                    {formatarMoeda(valor || 0)}
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                                                    <div className="bg-gray-900 text-white/80 text-[10px] py-1 px-2 rounded shadow-xl border border-white/10 whitespace-nowrap">
                                                        Exibir detalhamento
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                    </div>
                                                </div>
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
        const nomeGrupo = selecionado.grupoLabel; // Exibe o rótulo visual no título do detalhamento

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
        <div className="space-y-8">
            {/* ABAS DE EMPRESA */}
            <div className="border-b border-white/10 flex gap-0 overflow-x-auto">
                {['Victec', 'VMC Tech'].map(empresa => (
                    <EmpresaTab
                        key={empresa}
                        nome={empresa}
                        isActive={empresaAtiva === empresa}
                        onClick={() => setEmpresaAtiva(empresa)}
                    />
                ))}
            </div>

            {/* CONTROLES */}
            {empresaAtiva && (
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-white/60">Ano:</label>
                        <select
                            value={anoAtivo}
                            onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
                            className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
                        >
                            {[2024, 2025, 2026].map(ano => <option key={ano} value={ano}>{ano}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {['Mensal', 'Acumulado'].map(v => (
                            <button
                                key={v}
                                onClick={() => setVisao(v)}
                                className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                                    visao === v
                                    ? 'bg-acelerar-light-blue text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* CONTEÚDO */}
            {!empresaAtiva ? (
                <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-white/10 bg-white/5">
                    <p className="text-xs text-white/30 font-medium uppercase tracking-widest">
                        Selecione uma empresa para visualizar o DFC.
                    </p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-3">
                    <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Carregando dados...</p>
                </div>
            ) : (
                <>
                    {renderTabelaMensal()}
                    {renderDetalhamento()}
                </>
            )}
        </div>
    );
}

export default function DFCPage() {
    return (
        <Suspense fallback={<div className="text-white">Carregando...</div>}>
            <DFCContent />
        </Suspense>
    );
}
