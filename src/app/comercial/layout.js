"use client";
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// --- Contexto para compartilhar filtros ---
const ComercialContext = createContext(null);
export const useComercial = () => useContext(ComercialContext);

// --- Mapa completo de logos das 9 empresas ---
const LOGO_MAP = {
    'VMC Tech':  '/logo_vmctech.png',
    'Victec':    '/logo_victec.png',
    'GRT':       '/logo_GRT.png',
    'Bllog':     '/logo_bllog.png',
    'M3':        '/logo_m3sistemas.png',
    'Acelerar':  '/logo_acelerar_sidebar.png',
    'bLive':     '/logo_blive.png',
    'Condway':   '/logo_condway.png',
    'Isket':     '/logo_isket.png',
};

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

    // --- Estados de permissão (NOVO) ---
    const [empresasPermitidas, setEmpresasPermitidas] = useState([]);
    const [telasPermitidas, setTelasPermitidas] = useState([]);
    const [loadingPermissoes, setLoadingPermissoes] = useState(true);

    // Estados dos filtros que serão compartilhados com todas as páginas (INALTERADOS)
    const [selectedEmpresa, setSelectedEmpresa] = useState('');
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

    const handleMesChange = (mes) => { setSelectedMeses(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]); };

    // --- Busca de permissões do usuário logado (NOVO) ---
    // Segue o mesmo padrão do dashboard/page.js: createBrowserClient + consulta direta ao Supabase
    useEffect(() => {
        const fetchPermissoes = async () => {
            try {
                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                );

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push('/'); return; }

                // Verifica o perfil do usuário
                const { data: perfil } = await supabase
                    .from('perfis_usuario')
                    .select('perfil, ativo')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!perfil || !perfil.ativo || perfil.perfil === 'AGUARDANDO') {
                    router.push('/aguardando');
                    return;
                }

                let empresasLista = [];
                let telasLista = [];

                if (perfil.perfil === 'ADMINISTRADOR') {
                    // Administrador: acesso total — busca todas as empresas e telas do módulo COMERCIAL
                    const [empresasRes, modulosRes] = await Promise.all([
                        supabase.from('empresas_disponiveis').select('nome').order('ordem'),
                        supabase.from('modulos_disponiveis').select('tela').eq('modulo', 'COMERCIAL'),
                    ]);
                    empresasLista = (empresasRes.data || []).map(e => e.nome);
                    telasLista = (modulosRes.data || []).map(m => m.tela);
                } else {
                    // Usuário/Gerente: busca permissões granulares do módulo COMERCIAL
                    const { data: permissoes } = await supabase
                        .from('permissoes_usuario')
                        .select(`
                            modulos_disponiveis!permissoes_usuario_modulo_tela_id_fkey ( modulo, tela ),
                            empresas_disponiveis!permissoes_usuario_empresa_id_fkey ( nome )
                        `)
                        .eq('usuario_id', user.id);

                    if (permissoes && permissoes.length > 0) {
                        const permComercial = permissoes.filter(
                            p => p.modulos_disponiveis?.modulo === 'COMERCIAL'
                        );
                        empresasLista = [...new Set(
                            permComercial.map(p => p.empresas_disponiveis?.nome).filter(Boolean)
                        )];
                        telasLista = [...new Set(
                            permComercial.map(p => p.modulos_disponiveis?.tela).filter(Boolean)
                        )];
                    }
                }

                setEmpresasPermitidas(empresasLista);
                setTelasPermitidas(telasLista);

                // Define a empresa inicial como a primeira da lista de permitidas
                if (empresasLista.length > 0) {
                    setSelectedEmpresa(empresasLista[0]);
                }
            } catch (err) {
                console.error('Erro ao carregar permissões do módulo Comercial:', err);
            } finally {
                setLoadingPermissoes(false);
            }
        };

        fetchPermissoes();
    }, [router]);

    // O valor que será compartilhado com as páginas filhas (INALTERADO — mesmas chaves de antes)
    const contextValue = {
        selectedEmpresa, setSelectedEmpresa,
        logoEmpresa: LOGO_MAP[selectedEmpresa] || '/logo_acelerar_sidebar.png',
        anos, setAnos,
        selectedAno, setSelectedAno,
        meses, setMeses,
        selectedMeses, setSelectedMeses,
        produtos, setProdutos,
        selectedProduto, setSelectedProduto,
        vendedores, setVendedores,
        selectedVendedor, setSelectedVendedor,
        sdrs, setSdrs,
        selectedSdr, setSelectedSdr,
        MESES_ORDEM
    };

    if (loadingPermissoes) {
        return (
            <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-acelerar-light-blue mb-4" />
                    <p className="text-white/60 text-sm">Carregando módulo...</p>
                </div>
            </div>
        );
    }

    return (
        <ComercialContext.Provider value={contextValue}>
            <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
                <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14">
                    <div className="flex items-center gap-4">
                        <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} className="drop-shadow-lg" />
                        <h1 className="text-xl font-bold text-acelerar-light-blue ml-20">Comercial</h1>
                    </div>
                    <nav className="flex items-center gap-2">
                        {telasPermitidas.includes('resultados') && (
                            <NavLink href="/comercial/resultados">📊 Resultados</NavLink>
                        )}
                        {telasPermitidas.includes('desempenho') && (
                            <NavLink href="/comercial/desempenho">🏆 Desempenho</NavLink>
                        )}
                        {/* customer-success: oculto — será habilitado em versão futura */}
                        {/* {telasPermitidas.includes('customer-success') && (
                            <NavLink href="/comercial/customer-success">❤️ Customer Success</NavLink>
                        )} */}
                        {telasPermitidas.includes('inadimplencia') && (
                            <NavLink href="/comercial/inadimplencia">📋 Inadimplência</NavLink>
                        )}
                    </nav>
                    <div>
                        <button onClick={() => router.push('/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors mr-4">&larr; Voltar ao Hub</button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-64 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
                        <FilterSelect
                            label="Empresa"
                            value={selectedEmpresa}
                            onChange={(e) => setSelectedEmpresa(e.target.value)}
                            options={empresasPermitidas}
                        />
                        <FilterSelect label="Ano" value={selectedAno} onChange={(e) => setSelectedAno(parseInt(e.target.value))} options={anos} disabled={anos.length === 0} />
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
                        <FilterSelect label="Produto" value={selectedProduto} onChange={(e) => setSelectedProduto(e.target.value)} options={produtos} />
                        <FilterSelect label="Vendedor" value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)} options={vendedores} />
                        <FilterSelect label="SDR" value={selectedSdr} onChange={(e) => setSelectedSdr(e.target.value)} options={sdrs} />
                    </aside>

                    <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </ComercialContext.Provider>
    );
}
