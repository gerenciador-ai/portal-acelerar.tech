// Arquivo: src/app/comercial/inadimplencia/InadimplenciaView.js
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useComercial } from '../layout';

import InadimplenciaKpiCards from './components/InadimplenciaKpiCards';
import InadimplenciaDonutChart from './components/InadimplenciaDonutChart';
import InadimplenciaSummaryTable from './components/InadimplenciaSummaryTable';
import InadimplenciaDetailTable from './components/InadimplenciaDetailTable';

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

// Objeto para dar peso numérico à gravidade da faixa de atraso
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
        }))
        // --- CORREÇÃO NA ORDENAÇÃO ---
        .sort((a, b) => {
            // Primeiro, ordena pela faixa de atraso, da mais grave para a menos grave
            const faixaCompare = faixaOrder[b.faixaAtraso] - faixaOrder[a.faixaAtraso];
            if (faixaCompare !== 0) {
                return faixaCompare;
            }
            // Se a faixa for a mesma, ordena pelo maior valor total (desempate)
            return b.valorTotal - a.valorTotal;
        });

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
            
            <InadimplenciaKpiCards kpis={processedData.kpis} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-black/20 p-4 rounded-lg border border-white/10">
                    <InadimplenciaDonutChart data={processedData.donutChartData} />
                </div>
                <div className="lg:col-span-2 bg-black/20 p-4 rounded-lg border border-white/10">
                    <InadimplenciaSummaryTable data={processedData.summaryTableData} />
                </div>
            </div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <InadimplenciaDetailTable data={processedData.detailTableData} empresa={context.selectedEmpresa} />
            </div>
        </div>
    );
}
