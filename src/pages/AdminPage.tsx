import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AVISO_DEFAULT, PRODUTOS } from '../lib/types'
import type { AvisoConfig, Pedido } from '../lib/types'

const ADMIN_USER = 'Ryanzinkkj'
const ADMIN_PASS = '160206Ryan#'
const SESSION_KEY = 'copa_adm_v1'

export default function AdminPage() {
  const [logado, setLogado] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [loginErro, setLoginErro] = useState('')

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [aviso, setAviso] = useState<AvisoConfig>(AVISO_DEFAULT)
  const [editAviso, setEditAviso] = useState<AvisoConfig>(AVISO_DEFAULT)
  const [salvandoAviso, setSalvandoAviso] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'entregues'>('todos')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setLogado(true)
  }, [])

  useEffect(() => {
    if (!logado) return
    carregarDados()

    channelRef.current = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => carregarDados())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config' }, (payload) => {
        if ((payload.new as { key: string }).key === 'aviso') {
          const cfg = (payload.new as { key: string; value: AvisoConfig }).value
          setAviso(cfg)
          setEditAviso(cfg)
        }
      })
      .subscribe()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [logado])

  async function carregarDados() {
    const [{ data: orders }, { data: cfg }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('config').select('value').eq('key', 'aviso').single(),
    ])
    if (orders) setPedidos(orders as Pedido[])
    if (cfg) { setAviso(cfg.value as AvisoConfig); setEditAviso(cfg.value as AvisoConfig) }
  }

  function login(e: React.FormEvent) {
    e.preventDefault()
    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setLogado(true)
    } else {
      setLoginErro('Usuário ou senha incorretos.')
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setLogado(false)
  }

  async function toggleAviso() {
    const novo = { ...aviso, ativo: !aviso.ativo }
    await supabase.from('config').update({ value: novo }).eq('key', 'aviso')
  }

  async function salvarAviso() {
    setSalvandoAviso(true)
    await supabase.from('config').update({ value: editAviso }).eq('key', 'aviso')
    setSalvandoAviso(false)
  }

  async function toggleEntregue(id: number, atual: boolean) {
    await supabase.from('orders').update({ entregue: !atual }).eq('id', id)
  }

  async function deletarPedido(id: number) {
    if (!confirm('Deletar este pedido?')) return
    await supabase.from('orders').delete().eq('id', id)
  }

  if (!logado) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <form onSubmit={login} className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-gray-800">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🏆</div>
            <h1 className="text-2xl font-black text-amarelo">Admin Copa 2026</h1>
          </div>
          {loginErro && <p className="text-red-400 text-sm mb-4 text-center">{loginErro}</p>}
          <input
            required value={usuario} onChange={e => setUsuario(e.target.value)}
            placeholder="Usuário"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-verde transition"
          />
          <input
            required type="password" value={senha} onChange={e => setSenha(e.target.value)}
            placeholder="Senha"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-verde transition"
          />
          <button type="submit" className="w-full bg-verde hover:bg-green-600 text-white font-bold py-3 rounded-xl transition">
            Entrar
          </button>
        </form>
      </div>
    )
  }

  const pedidosFiltrados = pedidos.filter(p =>
    filtro === 'todos' ? true : filtro === 'pendentes' ? !p.entregue : p.entregue
  )

  const totalGeral = pedidos.reduce((s, p) => s + p.total, 0)
  const qtdPorProduto: Record<string, number> = {}
  pedidos.forEach(p => p.itens.forEach(i => { qtdPorProduto[i.id] = (qtdPorProduto[i.id] ?? 0) + i.qty }))

  return (
    <div className="min-h-screen bg-gray-950 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-azul via-verde to-azul py-4 px-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-amarelo">🏆 Admin Copa 2026</h1>
          <p className="text-white/60 text-xs">Painel de pedidos</p>
        </div>
        <button onClick={logout} className="text-white/60 hover:text-white text-sm transition">Sair</button>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {/* Resumo */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="font-bold text-amarelo mb-3">📊 Resumo</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-verde">{pedidos.length}</p>
              <p className="text-xs text-gray-400">Pedidos</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-amarelo">R$ {totalGeral.toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-gray-400">Faturamento</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRODUTOS.map(p => (
              qtdPorProduto[p.id] ? (
                <div key={p.id} className="flex justify-between text-sm bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-gray-300">{p.emoji} {p.nome.split(' ').slice(-2).join(' ')}</span>
                  <span className="text-white font-bold">{qtdPorProduto[p.id]}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>

        {/* Notificação */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="font-bold text-amarelo mb-4">🔔 Notificação & Pedidos</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">Notificação ativa</p>
              <p className="text-xs text-gray-400">{aviso.ativo ? '🔴 Pedidos bloqueados' : '🟢 Pedidos liberados'}</p>
            </div>
            <button
              onClick={toggleAviso}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition ${aviso.ativo ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-verde hover:bg-green-600 text-white'}`}
            >
              {aviso.ativo ? 'Desativar' : 'Ativar'}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Título</label>
              <input
                value={editAviso.titulo}
                onChange={e => setEditAviso(a => ({ ...a, titulo: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-verde transition"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mensagem</label>
              <textarea
                value={editAviso.mensagem}
                onChange={e => setEditAviso(a => ({ ...a, mensagem: e.target.value }))}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-verde transition resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Rodapé</label>
              <input
                value={editAviso.rodape}
                onChange={e => setEditAviso(a => ({ ...a, rodape: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-verde transition"
              />
            </div>
            <button
              onClick={salvarAviso}
              disabled={salvandoAviso}
              className="w-full bg-azul hover:bg-blue-900 text-white font-bold py-2 rounded-xl text-sm transition disabled:opacity-50"
            >
              {salvandoAviso ? 'Salvando...' : '💾 Salvar texto'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['todos', 'pendentes', 'entregues'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${filtro === f ? 'bg-verde text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Pedidos */}
        <div className="space-y-3">
          {pedidosFiltrados.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhum pedido encontrado.</p>
          )}
          {pedidosFiltrados.map(p => (
            <div
              key={p.id}
              className={`bg-gray-900 rounded-xl p-4 border ${p.entregue ? 'border-gray-700 opacity-60' : 'border-gray-800'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold">{p.nome}</p>
                  <p className="text-sm text-gray-400">{p.telefone} · {p.cidade}/{p.estado}</p>
                  <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <span className="text-amarelo font-black text-lg">R$ {p.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="text-sm text-gray-300 mb-3 space-y-0.5">
                {p.itens.map(i => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.qty}x {i.nome}</span>
                    <span>R$ {(i.preco * i.qty).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
              {p.obs && <p className="text-xs text-gray-400 italic mb-3">Obs: {p.obs}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleEntregue(p.id, p.entregue)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${p.entregue ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-verde text-white hover:bg-green-600'}`}
                >
                  {p.entregue ? '↩ Marcar pendente' : '✅ Marcar entregue'}
                </button>
                <button
                  onClick={() => deletarPedido(p.id)}
                  className="px-4 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-red-200 text-sm font-bold transition"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
