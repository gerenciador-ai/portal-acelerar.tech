"use client";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

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

// Componente "burro": só recebe dados prontos e desenha.
const ChartCard = ({ data, title }) => {
    if (!data || !data.labels || data.labels.length === 0) {
        return <div className="flex items-center justify-center h-full text-white/50 text-xs">Sem dados para exibir.</div>;
    }
    return (
        <div className="bg-white/5 p-4 rounded-lg h-full">
            <div className="relative h-full w-full">
                <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: title } } }} data={data} />
            </div>
        </div>
    );
};

export default function GraficosResultados({ chartData }) {
    // Se os dados dos gráficos não estiverem prontos, não faz nada.
    if (!chartData) {
        return <div className="text-center text-white/50 col-span-full p-10">Calculando dados dos gráficos...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80"><ChartCard data={chartData.mrrVsMeta} title="MRR Acumulado vs. Meta" /></div>
            <div className="h-80"><ChartCard data={chartData.contratosVsMeta} title="Contratos Acumulados vs. Meta" /></div>
            <div className="h-80 col-span-1 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    <ChartCard data={chartData.mrrMensal} title="MRR Mensal" />
                    <ChartCard data={chartData.upsellMensal} title="Upsell Mensal" />
                    <ChartCard data={chartData.churnMensal} title="Churn Mensal" />
                </div>
            </div>
        </div>
    );
}
