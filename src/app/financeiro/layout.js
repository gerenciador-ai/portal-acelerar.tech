// Arquivo: src/app/financeiro/layout.js
"use client";
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// --- Componente para o Link do Menu Lateral (INALTERADO) ---
function NavLink({ href, children }) {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <a
            href={href}
            className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                ? 'bg-acelerar-light-blue text-white' // Estilo "aceso"
                : 'text-white/70 hover:bg-white/10 hover:text-white' // Estilo inativo
            }`}
        >
            {children}
        </a>
    );
}

// --- O Layout Principal do Módulo Financeiro ---
export default function FinanceiroLayout({ children }) {
    const router = useRouter();

    // --- Estados de permissão (NOVO) ---
    const [telasPermitidas, setTelasPermitidas] = useState([]);
    const [loadingPermissoes, setLoadingPermissoes] = useState(true);

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

                let telasLista = [];

                if (perfil.perfil === 'ADMINISTRADOR') {
                    // Administrador: acesso total — busca todas as telas do módulo FINANCEIRO
                    const { data: modulosRes } = await supabase
                        .from('modulos_disponiveis')
                        .select('tela')
                        .eq('modulo', 'FINANCEIRO');
                    telasLista = (modulosRes || []).map(m => m.tela);
                } else {
                    // Usuário/Gerente: busca permissões granulares do módulo FINANCEIRO
                    const { data: permissoes } = await supabase
                        .from('permissoes_usuario')
                        .select(`
                            modulos_disponiveis!permissoes_usuario_modulo_tela_id_fkey ( modulo, tela )
                        `)
                        .eq('usuario_id', user.id);

                    if (permissoes && permissoes.length > 0) {
                        const permFinanceiro = permissoes.filter(
                            p => p.modulos_disponiveis?.modulo === 'FINANCEIRO'
                        );
                        telasLista = [...new Set(
                            permFinanceiro.map(p => p.modulos_disponiveis?.tela).filter(Boolean)
                        )];
                    }
                }

                setTelasPermitidas(telasLista);
            } catch (err) {
                console.error('Erro ao carregar permissões do módulo Financeiro:', err);
            } finally {
                setLoadingPermissoes(false);
            }
        };

        fetchPermissoes();
    }, [router]);

    // Verifica se uma tela específica está liberada para o usuário
    const temAcesso = (tela) => telasPermitidas.includes(tela);

    // Agrupa as telas por seção para controle de visibilidade dos cabeçalhos
    const temRelatorios   = temAcesso('dashboard') || temAcesso('bp') || temAcesso('dre') || temAcesso('dfc');
    const temPlanejamento = temAcesso('premissas') || temAcesso('orcamento');

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
        <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
            {/* Cabeçalho Fixo do Portal (INALTERADO) */}
            <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14">
                <div className="flex items-center gap-4">
                    <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} />
                </div>
                <div>
                    <button onClick={() => router.push('/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors mr-4">&larr; Voltar ao Hub</button>
                </div>
            </header>
            {/* Corpo do Módulo com Menu Lateral (INALTERADO) */}
            <div className="flex flex-1 overflow-hidden">
                {/* Menu Lateral Esquerdo — links filtrados por permissão */}
                <aside className="w-56 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-2">
                    {/* Seção de Relatórios — só aparece se o usuário tiver acesso a pelo menos uma tela */}
                    {temRelatorios && (
                        <>
                            <h2 className="text-lg font-semibold text-white/90 mb-2 px-2">Relatórios</h2>
                            {temAcesso('dashboard') && <NavLink href="/financeiro/dashboard">Dashboard</NavLink>}
                            {temAcesso('bp')        && <NavLink href="/financeiro/bp">Balanço Patrimonial</NavLink>}
                            {temAcesso('dre')       && <NavLink href="/financeiro/dre">DRE</NavLink>}
                            {temAcesso('dfc')       && <NavLink href="/financeiro/dfc">DFC</NavLink>}
                        </>
                    )}

                    {/* Seção de Planejamento (FP&A) — só aparece se o usuário tiver acesso a pelo menos uma tela */}
                    {temPlanejamento && (
                        <>
                            <h2 className="text-lg font-semibold text-white/90 mt-6 mb-2 px-2">Planejamento</h2>
                            {temAcesso('premissas') && <NavLink href="/financeiro/fpa/premissas">Premissas</NavLink>}
                            {temAcesso('orcamento') && <NavLink href="/financeiro/fpa/orcamento">Orçamento</NavLink>}
                        </>
                    )}
                </aside>

                {/* Área de Conteúdo Principal (INALTERADA) */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
