"use client"; // 1. Transformado em Componente de Cliente
import Image from 'next/image';
import { useComercial } from '../layout'; // 2. Importa o hook do nosso contexto

// --- Página de Desempenho (Agora conectada ao layout) ---
export default function DesempenhoPage() {
    // 3. Recebe os dados e o estado de carregamento diretamente do layout pai
    const { loading, error, selectedEmpresa, logoEmpresa } = useComercial();

    // 4. Renderiza o conteúdo principal, tratando os estados de carregamento e erro
    if (loading) return <p className="text-center p-10">Carregando dados do Ploomes...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Desempenho do Time</h1>
            </div>

            <div className="space-y-6">
                {/* Seção 1: Cards de MVP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-white/50">🏆 MVP Vendedor do Mês</p>
                        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-white/50">🏆 MVP SDR do Mês</p>
                        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                    </div>
                </div>

                {/* Seção 2: Gráficos de Ranking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[200px] flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-white/50">📊 Ranking de Vendedores (MRR)</p>
                        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[200px] flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-white/50">📊 Ranking de SDRs (MRR - Top 5)</p>
                        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                    </div>
                </div>

                {/* Seção 3: Funil de SDRs */}
                <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center">
                    <p className="text-sm font-bold text-white/50">🚀 Funil de SDRs (Novos Negócios)</p>
                    <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                </div>

                {/* Seção 4: Tabela de Auditoria */}
                <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center">
                    <p className="text-sm font-bold text-white/50">📋 Auditoria de Negócios Convertidos (Ganhos)</p>
                    <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                </div>
            </div>
        </>
    );
}
