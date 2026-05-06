# Vendas Copa 2026

Site de controle de vendas de figurinhas e álbuns da Copa do Mundo 2026.

## Stack

- HTML/CSS/JS puro — sem frameworks, sem build step
- Dados persistidos em `localStorage` no navegador do usuário
- Hospedagem: Netlify (site ID: `c826e503-7f85-4d6f-b429-2d73afd187df`)
- Deploy automático: push para `main` no GitHub dispara deploy no Netlify

## Estrutura

```
vendas-copa/
├── index.html       # app completo (HTML + CSS + JS inline)
├── netlify.toml     # configuração do Netlify (cache-control: no-cache)
├── .gitignore       # exclui atualizar-site.bat (contém token sensível)
└── CLAUDE.md        # este arquivo
```

## Como fazer deploy

Qualquer `git push` para o branch `main` dispara o deploy automático via integração GitHub → Netlify.

```bash
git add index.html
git commit -m "descrição da mudança"
git push
```

O Netlify detecta o push e publica em ~10-30 segundos. Todos os dispositivos recebem a versão nova automaticamente (Cache-Control: no-cache).

## Dados e preços

Preços e custos estão hardcoded em `index.html` nas constantes `PRECOS` e `CUSTOS`.

| Produto             | Venda     | Custo     |
|---------------------|-----------|-----------|
| Pacotinho figurinha | R$ 5,80   | R$ 5,60   |
| Álbum Capa Mole     | R$ 20,92  | R$ 19,92  |
| Álbum Capa Dura     | R$ 61,62  | R$ 59,62  |
| Álbum C. Dura Prata | R$ 65,92  | R$ 63,92  |
| Álbum C. Dura Ouro  | R$ 66,92  | R$ 63,92  |

## Chave Pix

- Chave: `61.986.179/0001-92`
- Beneficiário: `Ryan Granchelli`

Definido em `index.html` nas constantes `PIX_CHAVE` e `PIX_NOME`.

## Atenção

- O arquivo `atualizar-site.bat` contém o token do Netlify CLI — **nunca commitar** (já está no .gitignore)
- Os dados de clientes ficam no `localStorage` de cada navegador — não são sincronizados entre dispositivos
