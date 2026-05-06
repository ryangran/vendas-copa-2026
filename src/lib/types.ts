export interface ItemPedido {
  id: string
  nome: string
  preco: number
  qty: number
}

export interface Pedido {
  id: number
  created_at: string
  nome: string
  telefone: string
  cep: string
  cidade: string
  estado: string
  itens: ItemPedido[]
  total: number
  obs: string
  entregue: boolean
}

export interface AvisoConfig {
  ativo: boolean
  titulo: string
  mensagem: string
  rodape: string
}

export const PRODUTOS = [
  { id: 'pacote', nome: 'Pacotinho de Figurinha', preco: 5.90, emoji: '🃏' },
  { id: 'capaMole', nome: 'Álbum Capa Mole', preco: 21.92, emoji: '📖' },
  { id: 'capaDuraNormal', nome: 'Álbum Capa Dura Normal', preco: 62.62, emoji: '📕' },
  { id: 'capaDuraPrata', nome: 'Álbum Capa Dura Prata', preco: 66.92, emoji: '🥈' },
  { id: 'capaDuraOuro', nome: 'Álbum Capa Dura Ouro', preco: 67.92, emoji: '🥇' },
] as const

export const WPP_LOJA = '5511944804280'
export const PIX_CHAVE = '61.986.179/0001-92'
export const PIX_NOME = 'Ryan Granchelli'

export const AVISO_DEFAULT: AvisoConfig = {
  ativo: false,
  titulo: '⚠️ Pedidos temporariamente indisponíveis',
  mensagem: 'Em breve abriremos o 3º lote de pedidos!',
  rodape: 'Acompanhe o grupo para não perder!',
}
