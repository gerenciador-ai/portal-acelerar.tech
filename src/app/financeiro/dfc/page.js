// Arquivo: src/app/financeiro/dfc/page.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

// --- Mapeamento Baseado no Plano de Contas 2026 ---
const MAPA_PLANO_CONTAS = {
    "Receitas": ["311014001", "311014002", "Receita de Serviços", "Multas Recebidas", "Juros Recebidos"],
    "Impostos": ["Simples Nacional", "PIS", "COFINS", "ISS", "IRPJ", "CSLL", "INSS Retido", "Retenções"],
    "Pessoal": ["Salários", "Pró-Labores", "Bolsa Estágio", "13ª Salário", "Férias", "FGTS", "INSS", "VA", "VR", "VT", "Seguro Saúde"],
    "Ocupação": ["Aluguel", "Condomínio", "Energia", "Limpeza", "Internet", "Telefone"],
    "Serviços/Ferramentas": ["Ferramentas Tecnológicas", "Suporte", "Materiais", "Consultoria"],
    "Financeiro/Outros": ["Tarifas", "Juros Pagos", "Empréstimos", "Rendimento", "Receita Financeira"]
};

function categorizar(nomeCategoria) {
    if (!nomeCategoria) return "Outros";
    for (const [grupo, termos] of Object.entries(MAPA_PLANO_CONTAS)) {
        if (termos.some(termo => nomeCategoria.includes(termo))) return grupo;
    }
    return "Outros";
}

// --- Componentes Auxiliares ---
function EmpresaTab({ nome, logo, isActive, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 transition-all border-b-2 font-medium ${
                isActive ? 'border-acelerar-light-blue text-white bg-white/5' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
        >
            {logo && <Image src={logo} alt={nome} width={20} height={20} className="opacity-80" />}
            {nome}
        </button>
    );
}

export default function DFCPage() {
    const [empresaAtiva, setEmpresaAtiva] = useState(null);
    const [visao, setVisao] = useState('mensal'); // 'mensal' ou 'diaria'
    const [anoAtivo, setAnoAtivo] = useState(2026);
    const [mesAtivo, setMesAtivo] = useState(new Date().getMonth() + 1);
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(false);

    // Busca de dados ao trocar de empresa
    useEffect(() => {
        if (!empresaAtiva || empresaAtiva === 'Consolidado') return;

        async function carregarDados() {
            setLoading(true);
            try {
                const res = await fetch(`/api/financeiro/dfc?empresa=${empresaAtiva}`);
                const json = await res.json();
                setDados(json);
            } catch (error) {
                console.error("Erro ao carregar DFC:", error);
            } finally {
                setLoading(false);
            }
        }
        carregarDados();
    }, [empresaAtiva]);

    // Processamento dos dados para a tabela
    const fluxoProcessado = useMemo(() => {
        if (!dados || !dados.fluxo) return [];
        
        return dados.fluxo.map(item => ({
            ...item,
            grupoGerencial: categorizar(item.categoria)
        }));
    }, [dados]);

    const renderTabelaMensal = () => {
        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const grupos = Object.keys(MAPA_PLANO_CONTAS);

        return (
            <div className="overflow-x-auto bg-black/20 rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 font-semibold text-white/70 w-48">Categoria</th>
                            {meses.map(m => <th key={m} className="p-4 font-semibold text-white/70 text-right">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {grupos.map(grupo => (
                            <tr key={grupo} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-medium text-white">{grupo}</td>
                                {meses.map((_, i) => {
                                    const mesNum = i + 1;
                                    const valorMes = fluxoProcessado
                                        .filter(it => new Date(it.dataVencimento).getMonth() + 1 === mesNum && it.grupoGerencial === grupo)
                                        .reduce((acc, it) => acc + (it.tipo === 'entrada' ? it.valor : -it.valor), 0);
                                    
                                    return (
                                        <td key={i} className={`p-4 text-right ${valorMes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {valorMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-acelerar-dark-blue text-white">
            {/* Barra de Abas das Empresas */}
            <div className="flex border-b border-white/10 mb-6">
                <EmpresaTab nome="Consolidado" logo="/logo_acelerar_login.png" isActive={empresaAtiva === 'Consolidado'} onClick={() => setEmpresaAtiva('Consolidado')} />
                <EmpresaTab nome="VMC Tech" logo="/logo_vmctech.png" isActive={empresaAtiva === 'VMC Tech'} onClick={() => setEmpresaAtiva('VMC Tech')} />
                <EmpresaTab nome="Victec" logo="/logo_victec.png" isActive={empresaAtiva === 'Victec'} onClick={() => setEmpresaAtiva('Victec')} />
            </div>

            {!empresaAtiva ? (
                <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-white/10 rounded-2xl">
                    <p className="text-white/40 text-lg">Selecione uma empresa na aba acima para visualizar o DFC.</p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Cabeçalho de Controles */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="flex bg-black/30 p-1 rounded-lg">
                                <button onClick={() => setVisao('mensal')} className={`px-4 py-1.5 rounded-md text-sm transition-all ${visao === 'mensal' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>Mensal</button>
                                <button onClick={() => setVisao('diaria')} className={`px-4 py-1.5 rounded-md text-sm transition-all ${visao === 'diaria' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>Diário</button>
                            </div>
                            <span className="text-sm text-white/40">|</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-white/60">Ano:</span>
                                <select value={anoAtivo} onChange={(e) => setAnoAtivo(Number(e.target.value))} className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer">
                                    <option value={2026} className="bg-acelerar-dark-blue">2026</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${dados?.conciliadoAte ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'}`}>
                                {dados?.conciliadoAte 
                                    ? `Conciliado com extrato até ${new Date(dados.conciliadoAte).toLocaleDateString('pt-BR')}`
                                    : "Aguardando Conciliação de 2026"}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acelerar-light-blue mb-4"></div>
                            <p className="text-white/50">Buscando dados no Nibo...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-acelerar-light-blue rounded-full"></span>
                                Demonstrativo de Fluxo de Caixa - {empresaAtiva}
                            </h3>
                            {renderTabelaMensal()}
                            <p className="text-xs text-white/30 italic">
                                * Valores em itálico/claro representam projeções futuras (Previsto). Valores sólidos representam transações confirmadas (Realizado).
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
