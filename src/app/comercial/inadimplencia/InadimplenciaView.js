// Arquivo: src/app/comercial/inadimplencia/InadimplenciaView.js
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useComercial } from '../layout';
// 1. ALTERAÇÃO: Importar o novo componente de KPI
import InadimplenciaKpiCards from './components/InadimplenciaKpiCards';

// --- Funções Auxiliares de Cálculo ---

const diffInDays = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getFaixaAtraso = (dias) => {
    if (dias <= 30) return '0-30 dias';
    if (dias <= 60) return '31-60 dias';
    if (dias <= 90) return '61-90 dias';
    return '> 90 dias';
};

const faixaOrder = { '0-30 dias': 1, '31-60 dias': 2, '61-90 dias': 3, '> 90 dias': 4 };

// --- Componente Principal ---

export default function InadimplenciaView() {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const context = useComercial();

    useEffect(() => {
        if (!context || !context.selectedEmpresa) return;

        const empresa = context.selectedEmpresa;
        async function fetchInadimplencia() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/nibo/inadimplencia?empresa=${empresa}`);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.details || 'Falha ao buscar dados da API.');
                }
                const result = await response.json();
                setRawData(result);
            } catch (err) {
                setError(err.message);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        }
        fetchInadimplencia();
    }, [context]);

    const processedData = useMemo(() => {
        if (rawData.length === 0) {
            return {
                kpis: { totalAberto: 0, clientesInadimplentes: 0, repasseSittax: 0 },
                donutChartData: [],
                summaryTableData: [],
                detailTableData: [],
            };
        }

        const today = new Date();
        const parcelasComAtraso = rawData.map(p => {
            const diasAtraso = diffInDays(p.vencimento, today);
            return { ...p, diasAtraso, faixaAtraso: getFaixaAtraso(diasAtraso) };
        });

        const totalAberto = parcelasComAtraso.reduce((sum, p) => sum + p.valor, 0);
        
        const clientes = {};
        parcelasComAtraso.forEach(p => {
            const id = p.clienteCpfCnpj;
            if (!clientes[id]) {
                clientes[id] = {
                    nome: p.clienteNome,
                    cpfCnpj: p.clienteCpfCnpj,
                    parcelas: [],
                    valorTotal: 0,
                    faixaMaisGrave: '0-30 dias'
                };
            }
            clientes[id].parcelas.push(p);
            clientes[id].valorTotal += p.valor;
            if (faixaOrder[p.faixaAtraso] > faixaOrder[clientes[id].faixaMaisGrave]) {
                clientes[id].faixaMaisGrave = p.faixaAtraso;
            }
        });

        const faixasCount = { '0-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '> 90 dias': 0 };
        Object.values(clientes).forEach(c => {
            faixasCount[c.faixaMaisGrave]++;
        });
        const donutChartData = Object.entries(faixasCount).map(([name, value]) => ({ name, value }));

        const summaryTableData = Object.values(clientes).map(c => ({
            cliente: c.nome,
            valorTotal: c.valorTotal,
            mensalidadesAtraso: c.parcelas.length,
            faixaAtraso: c.faixaMaisGrave,
        }));

        return {
            kpis: {
                totalAberto: totalAberto,
                clientesInadimplentes: Object.keys(clientes).length,
                repasseSittax: totalAberto * 0.3,
            },
            donutChartData,
            summaryTableData,
            detailTableData: parcelasComAtraso,
        };

    }, [rawData]);

    if (!context) return <div className="text-center p-10 text-white/80">Inicializando...</div>;
    if (loading) return <div className="text-center p-10 text-white/80">Carregando e processando dados do NIBO para {context.selectedEmpresa}...</div>;
    if (error) return <div className="text-center p-10 bg-red-900/50 border border-red-700 rounded-lg text-white">{error}</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Painel de Inadimplência - {context.selectedEmpresa}</h2>
            
            {/* 2. ALTERAÇÃO: O placeholder foi substituído pelo componente real */}
            <InadimplenciaKpiCards kpis={processedData.kpis} />
            
            {/* Placeholders restantes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-black/20 p-4 rounded-lg border border-white/10">
                    <p className="font-bold text-acelerar-gold-light">Gráfico de Rosca (Placeholder)</p>
                     <pre className="text-xs text-cyan-400 mt-2 bg-black/30 p-2 rounded">
                        {JSON.stringify(processedData.donutChartData, null, 2)}
                    </pre>
                </div>
                <div className="lg:col-span-2 bg-black/20 p-4 rounded-lg border border-white/10">
                    <p className="font-bold text-acelerar-gold-light">Tabela Resumo por Cliente (Placeholder)</p>
                    <p className="text-white/70 text-sm mt-2">Total de clientes na tabela: {processedData.summaryTableData.length}</p>
                </div>
            </div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <p className="font-bold text-acelerar-gold-light">Tabela Detalhada de Parcelas (Placeholder)</p>
                <p className="text-white/70 text-sm mt-2">Total de parcelas na tabela: {processedData.detailTableData.length}</p>
            </div>
        </div>
    );
}
