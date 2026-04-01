"use client";
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend
} from 'chart.js';

// REGISTRO - Garantindo que tudo que a 'Bar' precisa está aqui.
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// OPÇÕES PADRÃO - Simplificadas ao máximo para o teste.
const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }, // Desabilitar legenda para simplificar
        title: { display: true, color: '#FFFFFF', font: { size: 14, weight: 'bold' } }
    },
    scales: {
        y: { beginAtZero: true, ticks: { color: '#FFFFFF' } },
        x: { ticks: { color: '#FFFFFF' } }
    }
};

// DADOS FALSOS E PERFEITOS
const FAKE_DATA = {
    labels: ['jan', 'fev', 'mar'],
    datasets: [
        {
            label: 'Teste de MRR',
            data: [100, 200, 150], // Dados simples e válidos
            backgroundColor: '#89CFF0',
        },
    ],
};

export default function GraficosResultados({ deals, selectedMeses, selectedEmpresa }) {
    // IGNORA TODOS OS DADOS DO PLOOMES E USA APENAS OS DADOS FALSOS
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 p-4 rounded-lg h-80">
                <h2 className="text-center text-white font-bold mb-2">Gráfico de Teste</h2>
                <div className="relative h-64">
                     <Bar 
                        options={{...defaultChartOptions, plugins: {...defaultChartOptions.plugins, title: {...defaultChartOptions.plugins.title, text: 'Teste com Dados Falsos'}}}} 
                        data={FAKE_DATA} 
                     />
                </div>
            </div>
             <div className="bg-white/5 p-4 rounded-lg h-80 flex items-center justify-center">
                <p className="text-white/50">Outros gráficos desabilitados para teste.</p>
            </div>
        </div>
    );
}
