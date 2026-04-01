"use client";
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const MESES_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const defaultChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', labels: { color: '#FFFFFF', font: { size: 10 } } },
        title: { display: true, color: '#FFFFFF', font: { size: 14, weight: 'bold' } },
        tooltip: { backgroundColor: '#0B2A4E', titleColor: '#89CFF0', bodyColor: '#FFFFFF', borderColor: '#89CFF0', borderWidth: 1 }
    },
    scales: {
        y: { beginAtZero: true, ticks: { color: '#FFFFFF', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
        x: { ticks: { color: '#FFFFFF', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
    }
};

export default function GraficosResultados({ deals, selectedMeses, selectedEmpresa }) {
    if (!deals || deals.length === 0 || !selectedMeses || selectedMeses.length === 0) {
        return <div className="text-center text-white/50 col-span-full p-10">Aguardando dados para gerar gráficos...</div>;
    }

    const labels = MESES_ORDEM.filter(mes => selectedMeses.includes(mes));
    const metas = { 'VMC Tech': { mrr: 8000, contratos: 17 }, 'Victec': { mrr: 10000, contratos: 17 } };
    const metaEmpresa = metas[selectedEmpresa];

    const getMonthlyData = (key, status) => labels.map(mes =>
        deals.filter(d => (status ? d.status === status : true) && new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') === mes)
             .reduce((sum, d) => sum + (d[key] || 0), 0)
    );
    const getAccumulatedData = (monthlyData) => monthlyData.reduce((acc, val) => [...acc, (acc.length > 0 ? acc[acc.length - 1] : 0) + val], []);

    const mrrMensal = getMonthlyData('mrr', 'Venda');
    const upsellMensal = getMonthlyData('upsell', 'Venda');
    const churnMensal = getMonthlyData('mrr', 'Churn');
    const contratosMensais = labels.map(mes => deals.filter(d => d.status === 'Venda' && new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') === mes).length);

    const mrrAcumulado = getAccumulatedData(mrrMensal);
    const contratosAcumulados = getAccumulatedData(contratosMensais);
    const metaMrrAcumulada = labels.map((_, i) => metaEmpresa.mrr * (i + 1));
    const metaContratosAcumulada = labels.map((_, i) => metaEmpresa.contratos * (i + 1));

    const mrrVsMetaData = { labels, datasets: [ { type: 'bar', label: 'MRR Acumulado', data: mrrAcumulado, backgroundColor: 'rgba(137, 207, 240, 0.6)' }, { type: 'line', label: 'Meta de MRR', data: metaMrrAcumulada, borderColor: '#FFFFFF', borderWidth: 2, pointRadius: 0 } ] };
    const contratosVsMetaData = { labels, datasets: [ { type: 'bar', label: 'Contratos Acumulados', data: contratosAcumulados, backgroundColor: 'rgba(137, 207, 240, 0.6)' }, { type: 'line', label: 'Meta de Contratos', data: metaContratosAcumulada, borderColor: '#FFFFFF', borderWidth: 2, pointRadius: 0 } ] };
    const mrrMensalData = { labels, datasets: [{ label: 'MRR Conquistado por Mês', data: mrrMensal, backgroundColor: '#89CFF0' }] };
    const upsellMensalData = { labels, datasets: [{ label: 'Upsell por Mês', data: upsellMensal, backgroundColor: '#2ECC71' }] };
    const churnMensalData = { labels, datasets: [{ label: 'MRR Perdido por Mês', data: churnMensal, backgroundColor: '#E74C3C' }] };

    const ChartCard = ({ data, title }) => (
        <div className="bg-white/5 p-4 rounded-lg h-80">
            <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: title } } }} data={data} />
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard data={mrrVsMetaData} title="MRR Acumulado vs. Meta" />
            <ChartCard data={contratosVsMetaData} title="Contratos Acumulados vs. Meta" />
            <div className="bg-white/5 p-4 rounded-lg h-80 col-span-1 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    <div className="h-full"><ChartCard data={mrrMensalData} title="MRR Mensal" /></div>
                    <div className="h-full"><ChartCard data={upsellMensalData} title="Upsell Mensal" /></div>
                    <div className="h-full"><ChartCard data={churnMensalData} title="Churn Mensal" /></div>
                </div>
            </div>
        </div>
    );
}
