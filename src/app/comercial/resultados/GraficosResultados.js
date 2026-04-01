"use client";
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// É necessário registrar os componentes do Chart.js que vamos usar
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

// Mapa para ordenar os meses corretamente
const MESES_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Opções padrão para os gráficos, para manter a consistência visual
const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                color: '#FFFFFF',
                font: { size: 10 }
            }
        },
        title: {
            display: true,
            color: '#FFFFFF',
            font: { size: 14, weight: 'bold' }
        },
        tooltip: {
            backgroundColor: '#0B2A4E',
            titleColor: '#89CFF0',
            bodyColor: '#FFFFFF',
            borderColor: '#89CFF0',
            borderWidth: 1
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: { color: '#FFFFFF', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
            ticks: { color: '#FFFFFF', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
    }
};

// Componente principal que renderiza todos os gráficos
export default function GraficosResultados({ deals, selectedMeses, selectedEmpresa }) {
    if (!deals || deals.length === 0) {
        return <p className="text-center text-white/50">Sem dados suficientes para gerar gráficos.</p>;
    }

    // 1. PREPARAÇÃO DOS DADOS
    const labels = MESES_ORDEM.filter(mes => selectedMeses.includes(mes));
    const metas = {
        'VMC Tech': { mrr: 8000, contratos: 17 },
        'Victec': { mrr: 10000, contratos: 17 }
    };
    const metaEmpresa = metas[selectedEmpresa];

    // Funções para calcular dados mensais e acumulados
    const getMonthlyData = (key) => labels.map(mes =>
        deals.filter(d => new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') === mes)
             .reduce((sum, d) => sum + (d[key] || 0), 0)
    );

    const getAccumulatedData = (monthlyData) => monthlyData.reduce((acc, val) => [...acc, (acc.length > 0 ? acc[acc.length - 1] : 0) + val], []);

    // Calculando todos os dados necessários
    const mrrMensal = getMonthlyData('mrr');
    const contratosMensais = labels.map(mes =>
        deals.filter(d => d.status === 'Venda' && new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') === mes).length
    );
    const upsellMensal = getMonthlyData('upsell');
    const churnMensal = deals.filter(d => d.status === 'Churn').length > 0 ? getMonthlyData('mrr') : new Array(labels.length).fill(0);


    const mrrAcumulado = getAccumulatedData(mrrMensal);
    const contratosAcumulados = getAccumulatedData(contratosMensais);
    const metaMrrAcumulada = labels.map((_, i) => metaEmpresa.mrr * (i + 1));
    const metaContratosAcumulada = labels.map((_, i) => metaEmpresa.contratos * (i + 1));

    // 2. DEFINIÇÃO DOS DADOS PARA CADA GRÁFICO

    const mrrVsMetaData = {
        labels,
        datasets: [
            {
                type: 'bar',
                label: 'MRR Acumulado',
                data: mrrAcumulado,
                backgroundColor: 'rgba(137, 207, 240, 0.6)', // Azul claro com transparência
                borderColor: '#89CFF0',
                borderWidth: 1,
            },
            {
                type: 'line',
                label: 'Meta de MRR',
                data: metaMrrAcumulada,
                borderColor: '#FFFFFF',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }
        ]
    };

    const contratosVsMetaData = {
        labels,
        datasets: [
            {
                type: 'bar',
                label: 'Contratos Acumulados',
                data: contratosAcumulados,
                backgroundColor: 'rgba(137, 207, 240, 0.6)',
                borderColor: '#89CFF0',
                borderWidth: 1,
            },
            {
                type: 'line',
                label: 'Meta de Contratos',
                data: metaContratosAcumulada,
                borderColor: '#FFFFFF',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }
        ]
    };

    const mrrMensalData = {
        labels,
        datasets: [{ label: 'MRR Conquistado por Mês', data: mrrMensal, backgroundColor: '#89CFF0' }]
    };

    const upsellMensalData = {
        labels,
        datasets: [{ label: 'Upsell por Mês', data: upsellMensal, backgroundColor: '#2ECC71' }] // Verde
    };

    const churnMensalData = {
        labels,
        datasets: [{ label: 'MRR Perdido por Mês', data: churnMensal, backgroundColor: '#E74C3C' }] // Vermelho
    };


    // 3. RENDERIZAÇÃO DOS GRÁFICOS
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráficos de Meta */}
            <div className="bg-white/5 p-4 rounded-lg h-80">
                <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: 'MRR Acumulado vs. Meta' } } }} data={mrrVsMetaData} />
            </div>
            <div className="bg-white/5 p-4 rounded-lg h-80">
                <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: 'Contratos Acumulados vs. Meta' } } }} data={contratosVsMetaData} />
            </div>

            {/* Gráficos Mensais */}
            <div className="bg-white/5 p-4 rounded-lg h-80 col-span-1 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    <div className="h-full">
                       <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: 'MRR Mensal' } } }} data={mrrMensalData} />
                    </div>
                     <div className="h-full">
                       <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: 'Upsell Mensal' } } }} data={upsellMensalData} />
                    </div>
                     <div className="h-full">
                       <Bar options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, title: { ...defaultChartOptions.plugins.title, text: 'Churn Mensal' } } }} data={churnMensalData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
