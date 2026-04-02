"use client";
import { useState, useEffect } from 'react';

// Esta é uma página de diagnóstico para inspecionar os dados brutos da API do Ploomes.
export default function DiagnosticoPage() {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Filtros exatos solicitados para o diagnóstico
                const empresa = 'VMC Tech';
                const ano = 2026;
                const mes = 3; // Março é o mês 3 (Janeiro = 1)

                setLoading(true);
                setError(null);
                
                // Chamada à API que busca todos os deals da empresa
                const response = await fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(empresa)}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Falha ao buscar dados da API');
                }

                // Filtra os dados aqui no cliente para corresponder ao critério exato
                const filteredDeals = data.value.filter(deal => {
                    const dealDate = new Date(deal.data);
                    return (
                        deal.status === 'Venda' &&
                        dealDate.getFullYear() === ano &&
                        (dealDate.getMonth() + 1) === mes // getMonth() é 0-11, então somamos 1
                    );
                });

                setDeals(filteredDeals);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Executa apenas uma vez ao carregar a página

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen font-mono">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Página de Diagnóstico - API Ploomes</h1>
            <p className="text-gray-400 mb-6">Exibindo dados brutos para: <span className="font-bold">VMC Tech</span> | <span className="font-bold">Março/2026</span> | <span className="font-bold">Clientes Fechados</span></p>

            {loading && <p className="text-blue-400">Buscando dados na API do Ploomes...</p>}
            
            {error && <p className="text-red-500">Erro ao buscar dados: {error}</p>}

            {!loading && !error && (
                <div>
                    <h2 className="text-xl text-green-400 mb-4">
                        {deals.length} registros encontrados.
                    </h2>
                    {/* Exibe cada "deal" como um bloco de texto JSON */}
                    {deals.map(deal => (
                        <div key={deal.id} className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
                            <pre className="whitespace-pre-wrap text-sm">
                                {JSON.stringify(deal, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
