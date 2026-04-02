"use client";
import { useState, useEffect } from 'react';

// Página de diagnóstico para inspecionar dados brutos de IDs específicos.
export default function DiagnosticoPage() {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // IDs específicos para o teste, conforme solicitado.
    const DEAL_IDS_PARA_TESTE = [
        '1105560652',
        '1105651119',
        '1105748145'
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Converte o array de IDs em uma string separada por vírgulas.
                const idsQueryParam = DEAL_IDS_PARA_TESTE.join(',');

                // Chama a nossa API, passando os IDs como parâmetro.
                const response = await fetch(`/api/ploomes/deals?ids=${idsQueryParam}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Falha ao buscar dados da API');
                }

                setDeals(data.value);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Executa apenas uma vez.

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen font-mono">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Página de Diagnóstico - API Ploomes</h1>
            <p className="text-gray-400 mb-6">Exibindo dados brutos para 3 IDs específicos.</p>

            {loading && <p className="text-blue-400">Buscando dados na API do Ploomes...</p>}
            
            {error && <p className="text-red-500">Erro ao buscar dados: {error}</p>}

            {!loading && !error && (
                <div>
                    <h2 className="text-xl text-green-400 mb-4">
                        {deals.length} de 3 registros encontrados.
                    </h2>
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
