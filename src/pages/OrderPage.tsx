import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUTOS, WPP_LOJA, PIX_CHAVE, PIX_NOME, AVISO_DEFAULT } from '../lib/types'
import type { AvisoConfig, ItemPedido } from '../lib/types'

interface Qtds { [id: string]: number }

interface Endereco {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  estado: string
}

export default function OrderPage() {
  const [aviso, setAviso] = useState<AvisoConfig>(AVISO_DEFAULT)
  const [avisoFechado, setAvisoFechado] = useState(false)
  const [qtds, setQtds] = useState<Qtds>({})
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [obs, setObs] = useState('')
  const [endereco, setEndereco] = useState<Endereco>({ cep: '', logradouro: '', bairro: '', cidade: '', estado: '' })
  const [cepErro, setCepErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [pedidoFinal, setPedidoFinal] = useState<{ itens: ItemPedido[]; total: number } | null>(null)

  useEffect(() => {
    supabase
      .from('config')
      .select('value')
      .eq('key', 'aviso')
      .single()
      .then(({ data }) => {
        if (data) setAviso(data.value as AvisoConfig)
      })

    const channel = supabase
      .channel('config-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config' }, (payload) => {
        if ((payload.new as { key: string }).key === 'aviso') {
          setAviso((payload.new as { key: string; value: AvisoConfig }).value)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const itensSelecionados: ItemPedido[] = PRODUTOS
    .filter(p => (qtds[p.id] ?? 0) > 0)
    .map(p => ({ id: p.id, nome: p.nome, preco: p.preco, qty: qtds[p.id] ?? 0 }))

  const total = itensSelecionados.reduce((s, i) => s + i.preco * i.qty, 0)

  function setQty(id: string, val: number) {
    setQtds(q => ({ ...q, [id]: Math.max(0, val) }))
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepErro('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) { setCepErro('CEP não encontrado.'); return }
      if (data.localidade.toLowerCase() !== 'itu') {
        setCepErro('Entregas somente em Itu/SP.')
        setEndereco(e => ({ ...e, cidade: data.localidade, estado: data.uf }))
        return
      }
      setEndereco({ cep: digits, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf })
    } catch {
      setCepErro('Erro ao buscar CEP.')
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (aviso.ativo) return
    if (itensSelecionados.length === 0) return alert('Selecione ao menos um produto.')
    if (cepErro) return alert('Corrija o CEP antes de continuar.')
    if (endereco.cidade.toLowerCase() !== 'itu') return alert('Entregas somente em Itu/SP.')

    setEnviando(true)
    const { error } = await supabase.from('orders').insert({
      nome, telefone,
      cep: endereco.cep,
      cidade: endereco.cidade,
      estado: endereco.estado,
      itens: itensSelecionados,
      total,
      obs,
      entregue: false,
    })
    setEnviando(false)

    if (error) { alert('Erro ao enviar pedido. Tente novamente.'); return }

    setPedidoFinal({ itens: itensSelecionados, total })
    setSucesso(true)

    const resumo = itensSelecionados.map(i => `${i.qty}x ${i.nome}`).join(', ')
    const msg = encodeURIComponent(`🛒 Novo pedido!\n\nCliente: ${nome}\nTel: ${telefone}\nCEP: ${endereco.cep}\nItens: ${resumo}\nTotal: R$ ${total.toFixed(2).replace('.', ',')}\nObs: ${obs || '-'}`)
    window.open(`https://wa.me/${WPP_LOJA}?text=${msg}`, '_blank')
  }

  if (sucesso && pedidoFinal) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-verde">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-verde mb-2">Pedido enviado!</h2>
          <p className="text-gray-300 mb-6">Agora pague via Pix para confirmar.</p>
          <div className="bg-gray-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-1">Chave Pix</p>
            <p className="font-mono font-bold text-amarelo text-lg">{PIX_CHAVE}</p>
            <p className="text-xs text-gray-400 mt-2">Beneficiário: <span className="text-white">{PIX_NOME}</span></p>
            <p className="text-xs text-gray-400 mt-1">Valor: <span className="text-verde font-bold">R$ {pedidoFinal.total.toFixed(2).replace('.', ',')}</span></p>
          </div>
          <div className="text-sm text-gray-300 mb-6 text-left space-y-1">
            {pedidoFinal.itens.map(i => (
              <div key={i.id} className="flex justify-between">
                <span>{i.qty}x {i.nome}</span>
                <span className="text-amarelo">R$ {(i.preco * i.qty).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
          <a
            href={`https://wa.me/${WPP_LOJA}`}
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-verde hover:bg-green-600 text-white font-bold py-3 rounded-xl mb-3 transition"
          >
            💬 Falar com a loja
          </a>
          <button
            onClick={() => { setSucesso(false); setQtds({}); setNome(''); setTelefone(''); setObs(''); setEndereco({ cep: '', logradouro: '', bairro: '', cidade: '', estado: '' }) }}
            className="block w-full border border-gray-600 text-gray-300 py-3 rounded-xl hover:bg-gray-800 transition"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-10">
      {/* Modal aviso */}
      {aviso.ativo && !avisoFechado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 border border-amarelo rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-amarelo mb-3">{aviso.titulo}</h2>
            <p className="text-gray-200 mb-3">{aviso.mensagem}</p>
            <p className="text-sm text-gray-400 mb-6">{aviso.rodape}</p>
            <button
              onClick={() => setAvisoFechado(true)}
              className="w-full bg-amarelo text-gray-900 font-bold py-3 rounded-xl hover:bg-yellow-400 transition"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-azul via-verde to-azul py-8 px-4 text-center">
        <div className="text-4xl mb-2">🏆</div>
        <h1 className="text-3xl font-black text-amarelo tracking-wide">COPA 2026</h1>
        <p className="text-white/80 text-sm mt-1">Figurinhas & Álbuns — Itu/SP</p>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* Produtos */}
        <section>
          <h2 className="text-lg font-bold text-amarelo mb-3">🛒 Produtos</h2>
          <div className="space-y-3">
            {PRODUTOS.map(p => (
              <div key={p.id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between border border-gray-800">
                <div>
                  <p className="font-semibold">{p.emoji} {p.nome}</p>
                  <p className="text-verde font-bold text-lg">R$ {p.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(p.id, (qtds[p.id] ?? 0) - 1)} className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 font-bold text-lg flex items-center justify-center transition">−</button>
                  <input
                    type="number"
                    min={0}
                    value={qtds[p.id] ?? 0}
                    onChange={e => setQty(p.id, parseInt(e.target.value) || 0)}
                    className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1 text-white font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button onClick={() => setQty(p.id, (qtds[p.id] ?? 0) + 1)} className="w-8 h-8 rounded-full bg-verde hover:bg-green-600 font-bold text-lg flex items-center justify-center transition">+</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Resumo */}
        {itensSelecionados.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-verde">
            <h3 className="font-bold text-verde mb-2">Resumo</h3>
            {itensSelecionados.map(i => (
              <div key={i.id} className="flex justify-between text-sm text-gray-300">
                <span>{i.qty}x {i.nome}</span>
                <span>R$ {(i.preco * i.qty).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-700">
              <span>Total</span>
              <span className="text-amarelo">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={enviar} className="space-y-4">
          <h2 className="text-lg font-bold text-amarelo">📋 Seus dados</h2>
          <input
            required value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Nome completo"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-verde transition"
          />
          <input
            required value={telefone} onChange={e => setTelefone(e.target.value)}
            placeholder="WhatsApp (com DDD)"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-verde transition"
          />
          <div>
            <input
              value={endereco.cep}
              onChange={e => { setEndereco(en => ({ ...en, cep: e.target.value })); buscarCep(e.target.value) }}
              placeholder="CEP (somente Itu/SP)"
              maxLength={9}
              className={`w-full bg-gray-900 border rounded-xl px-4 py-3 focus:outline-none transition ${cepErro ? 'border-red-500' : 'border-gray-700 focus:border-verde'}`}
            />
            {cepErro && <p className="text-red-400 text-sm mt-1">{cepErro}</p>}
            {endereco.logradouro && (
              <p className="text-gray-400 text-sm mt-1">{endereco.logradouro}, {endereco.bairro} — {endereco.cidade}/{endereco.estado}</p>
            )}
          </div>
          <textarea
            value={obs} onChange={e => setObs(e.target.value)}
            placeholder="Observações (opcional)"
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-verde transition resize-none"
          />

          {aviso.ativo ? (
            <div className="w-full bg-gray-800 text-gray-500 font-bold py-4 rounded-xl text-center border border-gray-700">
              🔒 Pedidos indisponíveis no momento
            </div>
          ) : (
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-verde hover:bg-green-600 disabled:opacity-50 text-white font-black py-4 rounded-xl text-lg transition"
            >
              {enviando ? 'Enviando...' : '✅ Fazer Pedido'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
