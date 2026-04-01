"use client";
import { useState, useEffect } from 'react';

export default function ResultadosPage() {
    // Estados para guardar os dados e controlar o carregamento
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para os filtros
    const [anos, setAnos] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState('VMC Tech');
    const [selectedAno, setSelectedAno] = useState(null);

    // useEffect será executado assim que a página carregar
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Chama a nossa API interna segura
                const response = await fetch('/api/ploomes/deals');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Falha ao buscar dados');
                }
                
                // Por enquanto, apenas guardamos os dados brutos
                setDeals(data.value);

                // **Lógica para popular o filtro de Ano**
                // Extrai os anos únicos das datas de criação dos negócios e os ordena
                const extractedAnos = [...new Set(data.value.map(deal => new Date(deal.CreateDate).getFullYear()))];
                extractedAnos.sort((a, b) => b - a); // Ordena do mais recente para o mais antigo
                setAnos(extractedAnos);
                
                // Seleciona o ano mais recente como padrão
                if (extractedAnos.length > 0) {
                    setSelectedAno(extractedAnos[0]);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // O array vazio [] garante que isso rode apenas uma vez

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-6">Resultados (Performance)</h1>
            
            {/* Filtros Dinâmicos */}
            <div className="mb-6 p-4 bg-black/20 rounded-lg flex items-center gap-6">
                {/* Filtro de Empresa */}
                <div>
                    <label className="text-xs text-white/70 block mb-1">Empresa</label>
                    <select 
                        value={selectedEmpresa}
                        onChange={(e) => setSelectedEmpresa(e.target.value)}
                        className="bg-white/10 p-2 rounded-md text-white"
                    >
                        <option value="VMC Tech">VMC Tech</option>
                        <option value="Victec">Victec</option>
                    </select>
                </div>

                {/* Filtro de Ano */}
                <div>
                    <label className="text-xs text-white/70 block mb-1">Ano</label>
                    <select 
                        value={selectedAno || ''}
                        onChange={(e) => setSelectedAno(e.target.value)}
                        className="bg-white/10 p-2 rounded-md text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <option>Carregando...</option>
                        ) : (
                            anos.map(ano => <option key={ano} value={ano}>{ano}</option>)
                        )}
                    </select>
                </div>
            </div>

            {/* Seção de Status */}
            {loading && <p className="text-white/70">Buscando dados do Ploomes...</p>}
            {error && <p className="text-red-400">Erro: {error}</p>}

            {/* O resto da página (KPIs, Gráficos) continua como placeholder por enquanto */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
                <div className="bg-white/10 p-4 rounded-lg text-center">
                    <div className="text-xs uppercase text-white/60">MRR Conquistado</div>
                    <div className="text-2xl font-bold text-acelerar-light-blue mt-1">R$ 0</div>
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                     <div key={i} className="bg-white/10 p-4 rounded-lg text-center animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-3/4 mx-auto"></div>
                        <div className="h-8 bg-white/20 rounded w-1/2 mx-auto mt-2"></div>
                    </div>
                ))}
            </div>
            <div className="bg-white/10 p-6 rounded-lg">
                <p className="text-white/70">Gráficos e tabelas de detalhamento aparecerão aqui.</p>
            </div>
        </div>
    );
}
