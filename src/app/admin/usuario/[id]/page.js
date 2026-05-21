"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
// Estilo base para as tags <option> — garante visual escuro em todos os browsers/SO
const optStyle = { backgroundColor: '#0f1e35', color: 'white' };
export default function EditarUsuarioPage() {
  const router = useRouter();
  const { id } = useParams();
  // Dados do usuário
  const [perfil, setPerfil]       = useState(null);
  const [perfilSel, setPerfilSel] = useState('USUARIO');
  const [ativoSel, setAtivoSel]   = useState(false);
  const [setorSel, setSetorSel]   = useState('');
  // Dados estáticos (catálogos)
  const [modulos, setModulos]   = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores]   = useState([]);
  // Permissões selecionadas: Set de strings "modulo_tela_id::empresa_id"
  const [permissoesSel, setPermissoesSel] = useState(new Set());
  const [loading, setLoading]   = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro]         = useState(null);
  // Carrega dados do usuário e catálogos
  const carregarDados = useCallback(async () => {
    try {
      const [usuarioRes, dadosRes] = await Promise.all([
        fetch(`/api/admin/usuarios/${id}`),
        fetch('/api/admin/dados'),
      ]);
      const usuarioData = await usuarioRes.json();
      const dadosData   = await dadosRes.json();
      if (usuarioData.error) throw new Error(usuarioData.error);
      if (dadosData.error)   throw new Error(dadosData.error);
      setPerfil(usuarioData.perfil);
      setPerfilSel(usuarioData.perfil.perfil || 'USUARIO');
      setAtivoSel(usuarioData.perfil.ativo || false);
      setSetorSel(usuarioData.perfil.setor_id || '');
      setModulos(dadosData.modulos || []);
      setEmpresas(dadosData.empresas || []);
      setSetores(dadosData.setores || []);
      // Monta o Set de permissões atuais usando modulo_tela_id (nome real da coluna no banco)
      const permSet = new Set(
        (usuarioData.permissoes || []).map(p => `${p.modulo_tela_id}::${p.empresa_id}`)
      );
      setPermissoesSel(permSet);
    } catch (err) {
      setErro('Não foi possível carregar os dados do usuário.');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { carregarDados(); }, [carregarDados]);
  // Toggle de uma combinação tela+empresa
  const togglePermissao = (moduloTelaId, empresaId) => {
    const chave = `${moduloTelaId}::${empresaId}`;
    setPermissoesSel(prev => {
      const novo = new Set(prev);
      if (novo.has(chave)) { novo.delete(chave); } else { novo.add(chave); }
      return novo;
    });
  };
  // Seleciona/deseleciona todas as empresas para uma tela de módulo
  const toggleModuloCompleto = (moduloTelaId) => {
    const todasChaves = empresas.map(e => `${moduloTelaId}::${e.id}`);
    const todasMarcadas = todasChaves.every(c => permissoesSel.has(c));
    setPermissoesSel(prev => {
      const novo = new Set(prev);
      if (todasMarcadas) {
        todasChaves.forEach(c => novo.delete(c));
      } else {
        todasChaves.forEach(c => novo.add(c));
      }
      return novo;
    });
  };
  // Seleciona/deseleciona todas as telas de um módulo para uma empresa
  const toggleEmpresaCompleta = (empresaId) => {
    const todasChaves = modulos.map(m => `${m.id}::${empresaId}`);
    const todasMarcadas = todasChaves.every(c => permissoesSel.has(c));
    setPermissoesSel(prev => {
      const novo = new Set(prev);
      if (todasMarcadas) {
        todasChaves.forEach(c => novo.delete(c));
      } else {
        todasChaves.forEach(c => novo.add(c));
      }
      return novo;
    });
  };
  // Salva as permissões
  const salvar = async () => {
    setSalvando(true);
    setMensagem(null);
    setErro(null);
    try {
      // Converte o Set de strings para array de objetos com o nome correto da coluna
      const permissoes = Array.from(permissoesSel).map(chave => {
        const [modulo_tela_id, empresa_id] = chave.split('::');
        return { modulo_tela_id, empresa_id };
      });
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: id,
          perfil: perfilSel,
          ativo: ativoSel,
          setor_id: setorSel || null,
          permissoes,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMensagem('Permissões salvas com sucesso!');
    } catch (err) {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };
  // Agrupa módulos por nome do módulo (ex: COMERCIAL, FINANCEIRO)
  const modulosAgrupados = modulos.reduce((acc, m) => {
    if (!acc[m.modulo]) acc[m.modulo] = [];
    acc[m.modulo].push(m);
    return acc;
  }, {});
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-acelerar-light-blue mb-3" />
          <p className="text-white/50 text-sm">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }
  if (!perfil) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400">{erro || 'Usuário não encontrado.'}</p>
        <button onClick={() => router.push('/admin')} className="mt-4 text-sm text-acelerar-light-blue hover:underline">
          &larr; Voltar à lista
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/admin')} className="text-sm text-white/50 hover:text-white transition-colors mb-2 block">
            &larr; Voltar à lista de usuários
          </button>
          <h1 className="text-2xl font-bold text-white">{perfil.nome || 'Usuário sem nome'}</h1>
          <p className="text-white/50 text-sm">{perfil.email}</p>
        </div>
      </div>
      {/* Seção 1: Dados do Perfil */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 uppercase tracking-wider">
          1. Dados do Perfil
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Perfil de Acesso */}
          <div>
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Perfil de Acesso</label>
            <select
              value={perfilSel}
              onChange={(e) => setPerfilSel(e.target.value)}
              style={{ backgroundColor: '#0f1e35', color: 'white' }}
              className="w-full px-3 py-2 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-acelerar-light-blue"
            >
              <option value="AGUARDANDO" style={optStyle}>Aguardando</option>
              <option value="USUARIO" style={optStyle}>Usuário</option>
              <option value="GERENTE" style={optStyle}>Gerente</option>
              <option value="ADMINISTRADOR" style={optStyle}>Administrador</option>
            </select>
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Status</label>
            <select
              value={ativoSel ? 'true' : 'false'}
              onChange={(e) => setAtivoSel(e.target.value === 'true')}
              style={{ backgroundColor: '#0f1e35', color: 'white' }}
              className="w-full px-3 py-2 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-acelerar-light-blue"
            >
              <option value="true" style={optStyle}>Ativo</option>
              <option value="false" style={optStyle}>Inativo</option>
            </select>
          </div>
          {/* Setor */}
          <div>
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Setor</label>
            <select
              value={setorSel}
              onChange={(e) => setSetorSel(e.target.value)}
              style={{ backgroundColor: '#0f1e35', color: 'white' }}
              className="w-full px-3 py-2 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-acelerar-light-blue"
            >
              <option value="" style={optStyle}>— Sem setor —</option>
              {setores.map(s => (
                <option key={s.id} value={s.id} style={optStyle}>{s.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Seção 2: Matriz de Permissões */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white/80 uppercase tracking-wider">
            2. Permissões de Acesso
          </h2>
          <p className="text-white/40 text-xs mt-1">
            Marque as combinações de Tela + Empresa que este usuário poderá visualizar.
          </p>
        </div>
        {Object.entries(modulosAgrupados).map(([nomeModulo, telas]) => (
          <div key={nomeModulo}>
            {/* Cabeçalho do Módulo */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-acelerar-light-blue uppercase tracking-wider">
                {nomeModulo}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            {/* Tabela Telas × Empresas */}
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-white/40 font-medium w-40">Tela</th>
                    {empresas.map(empresa => (
                      <th key={empresa.id} className="text-center py-2 px-2 text-white/40 font-medium min-w-[80px]">
                        <div>{empresa.nome}</div>
                        {/* Botão "Marcar tudo" por empresa */}
                        <button
                          onClick={() => toggleEmpresaCompleta(empresa.id)}
                          className="text-[10px] text-acelerar-light-blue/60 hover:text-acelerar-light-blue mt-1"
                          title="Marcar/desmarcar todas as telas para esta empresa"
                        >
                          tudo
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {telas.map(tela => (
                    <tr key={tela.id} className="border-t border-white/5">
                      <td className="py-2 pr-4 text-white/70">
                        <div className="font-medium">{tela.label || tela.tela}</div>
                      </td>
                      {empresas.map(empresa => {
                        const chave = `${tela.id}::${empresa.id}`;
                        const marcado = permissoesSel.has(chave);
                        return (
                          <td key={empresa.id} className="text-center py-2 px-2">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => togglePermissao(tela.id, empresa.id)}
                              className="w-4 h-4 accent-acelerar-light-blue cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Linha de "Marcar tudo" por módulo */}
                  <tr className="border-t border-white/10">
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => telas.forEach(t => toggleModuloCompleto(t.id))}
                        className="text-[10px] text-acelerar-light-blue/60 hover:text-acelerar-light-blue"
                      >
                        Marcar todas as telas deste módulo
                      </button>
                    </td>
                    <td colSpan={empresas.length} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      {/* Feedback */}
      {mensagem && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-green-400 text-sm font-medium">{mensagem}</p>
        </div>
      )}
      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm">{erro}</p>
        </div>
      )}
      {/* Botões */}
      <div className="flex justify-end gap-4 pb-8">
        <button
          onClick={() => router.push('/admin')}
          className="px-6 py-2 text-sm font-semibold text-white/60 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          className="px-8 py-2 text-sm font-bold text-acelerar-dark-blue bg-acelerar-light-blue rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar Permissões'}
        </button>
      </div>
    </div>
  );
}
