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
    "OUTROS / NAO CLASSIFICADOS",
    "(=) SALDO LÍQUIDO DO PERÍODO"
];

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
        try {
            const res = await fetch(`/api/financeiro/dfc?empresa=${empresaAtiva}`);
            const data = await res.json();
            setDados(data);
        } catch (error) {
            console.error('Erro ao carregar DFC:', error);
        } finally {
            setLoading(false);
        }
    };

    const processarDFC = useMemo(() => {
        if (!dados || !dados.fluxo) return null;

        const matriz = {};
        LINHAS_DFC.forEach(linha => {
            matriz[linha] = Array(12).fill(0);
        });

        dados.fluxo.forEach(item => {
            if (!item.data) return;
            const data = new Date(item.data);
            const mes = data.getUTCMonth();
            const ano = data.getUTCFullYear();

            if (ano !== anoAtivo) return;

            const grupo = item.grupo_dfc;
            const valor = parseFloat(item.valor);
            
            if (matriz[grupo]) {
                matriz[grupo][mes] += valor;
            } else {
                matriz["OUTROS / NAO CLASSIFICADOS"][mes] += valor;
            }
        });

        for (let m = 0; m < 12; m++) {
            matriz["(=) RECEITA LÍQUIDA"][m] = matriz["RECEITAS OPERACIONAIS"][m] + matriz["(-) IMPOSTOS SOBRE VENDAS"][m];
            matriz["(=) FLUXO OPERACIONAL (FCO)"][m] = matriz["(=) RECEITA LÍQUIDA"][m] + matriz["(-) CUSTOS OPERACIONAIS"][m] + matriz["(-) DESPESAS ADMINISTRATIVAS"][m] + matriz["(-) DESPESAS COMERCIAIS"][m];
            matriz["(=) SALDO LÍQUIDO DO PERÍODO"][m] = matriz["(=) FLUXO OPERACIONAL (FCO)"][m] + matriz["(+/-) FLUXO DE INVESTIMENTO (FCI)"][m] + matriz["(+/-) FLUXO DE FINANCIAMENTO (FCF)"][m] + matriz["(-) DESPESAS FINANCEIRAS"][m] + matriz["OUTROS / NAO CLASSIFICADOS"][m];
        }

        return matriz;
    }, [dados, anoAtivo]);

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(valor);
    };

    const renderTabelaMensal = () => {
        const matriz = processarDFC;
        if (!matriz) return null;
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
                        {LINHAS_DFC.map((linha) => {
                            const isTotal = linha.startsWith('(=)');
                            return (
                                <tr key={linha} className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}>
                                    <td className={`p-4 text-sm ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha}</td>
                                    {matriz[linha].map((valor, mIdx) => (
                                        <td key={mIdx} className={`p-4 text-sm text-right ${valor < 0 ? 'text-red-400' : 'text-white'}`}>
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
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
