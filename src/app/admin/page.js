"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Badge colorido para o perfil do usuário
function PerfilBadge({ perfil }) {
  const cores = {
    ADMINISTRADOR: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    GERENTE:       'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    USUARIO:       'bg-green-500/20 text-green-300 border border-green-500/30',
    AGUARDANDO:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${cores[perfil] || 'bg-white/10 text-white/60'}`}>
      {perfil}
    </span>
  );
}

// Badge de status ativo/inativo
function StatusBadge({ ativo }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${
      ativo
        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
        : 'bg-red-500/20 text-red-300 border border-red-500/30'
    }`}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const carregarUsuarios = async () => {
      try {
        const res = await fetch('/api/admin/usuarios');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUsuarios(data.usuarios || []);
      } catch (err) {
        setErro('Não foi possível carregar os usuários. Verifique sua conexão.');
      } finally {
        setLoading(false);
      }
    };
    carregarUsuarios();
  }, []);

  // Filtra por nome ou e-mail
  const usuariosFiltrados = usuarios.filter(u =>
    u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  // Contadores do resumo
  const totalAtivos    = usuarios.filter(u => u.ativo).length;
  const totalAguardando = usuarios.filter(u => u.perfil === 'AGUARDANDO').length;
  const totalInativos  = usuarios.filter(u => !u.ativo && u.perfil !== 'AGUARDANDO').length;

  return (
    <div className="space-y-6">
      {/* Título da Página */}
      <div>
        <h1 className="text-2xl font-bold text-white">Gestão de Usuários</h1>
        <p className="text-white/50 text-sm mt-1">
          Gerencie os perfis, acessos e permissões de todos os usuários do portal.
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider">Usuários Ativos</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{totalAtivos}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider">Aguardando Aprovação</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{totalAguardando}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider">Inativos</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{totalInativos}</p>
        </div>
      </div>

      {/* Barra de Busca */}
      <div>
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-acelerar-light-blue text-sm"
        />
      </div>

      {/* Tabela de Usuários */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-acelerar-light-blue mb-3" />
            <p className="text-white/50 text-sm">Carregando usuários...</p>
          </div>
        </div>
      ) : erro ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{erro}</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-white/50 font-medium uppercase tracking-wider text-xs">Nome</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium uppercase tracking-wider text-xs">E-mail</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium uppercase tracking-wider text-xs">Perfil</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium uppercase tracking-wider text-xs">Setor</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium uppercase tracking-wider text-xs">Ação</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-white/40 italic">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {usuario.nome || <span className="text-white/30 italic">Sem nome</span>}
                    </td>
                    <td className="px-4 py-3 text-white/70">{usuario.email}</td>
                    <td className="px-4 py-3">
                      <PerfilBadge perfil={usuario.perfil} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge ativo={usuario.ativo} />
                    </td>
                    <td className="px-4 py-3 text-white/50">
                      {usuario.setores?.nome || <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/usuario/${usuario.id}`)}
                        className="px-3 py-1 text-xs font-semibold bg-acelerar-light-blue/20 text-acelerar-light-blue border border-acelerar-light-blue/30 rounded hover:bg-acelerar-light-blue/30 transition-colors"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
