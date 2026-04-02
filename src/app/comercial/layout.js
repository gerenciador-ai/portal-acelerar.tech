"use client";
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect, useMemo, createContext, useContext } from 'react';

// --- Contexto para compartilhar dados e filtros ---
const ComercialContext = createContext(null);
export const useComercial = () => useContext(ComercialContext);

// --- Componentes do Layout ---
function NavLink({ href, children }) {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <a href={href} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-acelerar-light-blue text-acelerar-dark-blue' : 'text-white hover:bg-white/10'}`}>
            {children}
        </a>
    );
}

function FilterSelect({ label, value, onChange, options, disabled }) {
    return (
        <div>
            <label className="text-xs text-white/70 block mb-1 font-bold uppercase">{label}</label>
            <select value={value} onChange={onChange} className="bg-acelerar-dark-blue p-2 rounded-md text-white w-full border border-white/20" disabled={disabled}>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}

const MESES_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// --- O Layout Principal do Módulo Comercial ---
export default function ComercialLayout({ children }) {
    const router = useRouter();
    
    // Toda a lógica de estado e busca de dados foi movida para cá
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEmpresa, setSelectedEmpresa] = useState('VMC Tech');
    const [anos, setAnos] = useState([]);
    const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
    const [meses, setMeses] = useState([]);
    const [selectedMeses, setSelectedMeses] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [selectedProduto, setSelectedProduto] = useState('Todos');
    const [vendedores, setVendedores] = useState([]);
    const [selectedVendedor, setSelectedVendedor] = useState('Todos');
    const [sdrs, setSdrs] = useState([]);
    const [selectedSdr, setSelectedSdr] = useState('Todos');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true); setError(null);
                const response = await fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao buscar dados');
                const dealsComData = data.value.map(d => ({ ...d, data: new Date(d.data) }));
                setAllDeals(dealsComData);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedEmpresa]);

    useEffect(() => {
        if (allDeals.length === 0) return;
        const anosUnicos = [...new Set(allDeals.map(d => d.data.getFullYear()))].sort((a, b) => b - a);
        setAnos(anosUnicos);
        if (!anosUnicos.includes(selectedAno)) setSelectedAno(anosUnicos[0] || new Date().getFullYear());
        const getUniqueAndSorted = (key) => ['Todos', ...[...new Set(allDeals.map(d => d[key]).filter(Boolean).filter(v => v !== 'N/A'))].sort()];
        setProdutos(getUniqueAndSorted('produto'));
        setVendedores(getUniqueAndSorted('vendedor'));
        setSdrs(getUniqueAndSorted('sdr'));
    }, [allDeals]);

    useEffect(() => {
        if (allDeals.length === 0 || !selectedAno) return;
        const mesesDoAno = [...new Set(allDeals.filter(d => d.data.getFullYear() === selectedAno).map(d => d.data.getMonth()))];
        const mesesNomes = mesesDoAno.map(m => new Date(0, m).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
        setMeses(mesesNomes);
        setSelectedMeses(mesesNomes);
    }, [selectedAno, allDeals]);

    const handleMesChange = (mes) => { setSelectedMeses(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]); };

    // Filtra os dados uma única vez e os disponibiliza para as páginas filhas
    const filteredDeals = useMemo(() => {
        if (loading || allDeals.length === 0) return [];
        return allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr]);

    // O valor que será compartilhado com as páginas filhas
    const contextValue = {
        filteredDeals,
        allDeals,
        loading,
        error,
        selectedEmpresa,
        logoEmpresa: selectedEmpresa === 'VMC Tech' ? '/logo_vmctech.png' : '/logo_victec.png'
    };

    return (
        <ComercialContext.Provider value={contextValue}>
            <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
                <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14">
                    <div className="flex items-center gap-4">
                        <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} className="drop-shadow-lg" />
                        <h1 className="text-xl font-bold text-acelerar-light-blue ml-20">Comercial</h1>
                    </div>
                    <nav className="flex items-center gap-2">
                        <NavLink href="/comercial/resultados">📊 Resultados</NavLink>
                        <NavLink href="/comercial/desempenho">🏆 Desempenho</NavLink>
                        <NavLink href="/comercial/inadimplencia">📋 Inadimplência</NavLink>
                    </nav>
                    <div>
                        <button onClick={() => router.push('/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors mr-4">&larr; Voltar ao Hub</button>
                    </div>
                </header>
                
                {/* A ESTRUTURA DE LAYOUT COM SIDEBAR FOI MOVIDA PARA CÁ */}
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-64 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
                        <FilterSelect label="Empresa" value={selectedEmpresa} onChange={(e) => setSelectedEmpresa(e.target.value)} options={['VMC Tech', 'Victec']} disabled={loading} />
                        <FilterSelect label="Ano" value={selectedAno} onChange={(e) => setSelectedAno(parseInt(e.target.value))} options={anos} disabled={loading || anos.length === 0} />
                        <div>
                            <label className="text-xs text-white/70 block mb-1 font-bold uppercase">Meses</label>
                            <div className="bg-acelerar-dark-blue p-2 rounded-md border border-white/20 max-h-48 overflow-y-auto">
                                {meses.map(mes => (
                                    <label key={mes} className="flex items-center gap-2 p-1 rounded hover:bg-white/10 cursor-pointer">
                                        <input type="checkbox" checked={selectedMeses.includes(mes)} onChange={() => handleMesChange(mes)} className="form-checkbox bg-acelerar-dark-blue border-white/30 text-acelerar-light-blue focus:ring-acelerar-light-blue" />
                                        <span>{mes.charAt(0).toUpperCase() + mes.slice(1)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <FilterSelect label="Produto" value={selectedProduto} onChange={(e) => setSelectedProduto(e.target.value)} options={produtos} disabled={loading} />
                        <FilterSelect label="Vendedor" value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)} options={vendedores} disabled={loading} />
                        <FilterSelect label="SDR" value={selectedSdr} onChange={(e) => setSelectedSdr(e.target.value)} options={sdrs} disabled={loading} />
                    </aside>
                    
                    {/* AQUI A PÁGINA FILHA (Resultados ou Desempenho) SERÁ RENDERIZADA */}
                    <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </ComercialContext.Provider>
    );
}
