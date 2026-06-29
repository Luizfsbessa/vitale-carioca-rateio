# Rateio de Água — Vitale Carioca (PWA)

Sistema de rateio de custos de água do Condomínio Vitale Carioca, com 96 unidades (12 andares × 8 unidades), leitura progressiva do hidrômetro, registro fotográfico para auditoria, anexo do boleto/fatura por competência, conferência de status, dashboard analítico e histórico completo.

## Estrutura do projeto

```
vitale-carioca-pwa/
├── index.html              → página principal (estrutura HTML)
├── manifest.json            → configuração do PWA (ícone, nome, cores)
├── service-worker.js        → cache offline
├── css/
│   ├── base.css                → variáveis de design, reset
│   ├── header.css               → logo e painel de competência
│   ├── tabs.css                  → abas e botões
│   ├── floor-cards.css         → cards de andar (Lançamento + Conferência)
│   ├── tables.css                → tabelas, histórico, badges
│   ├── dashboard.css           → gráficos e rankings
│   ├── photos.css                → captura/galeria de fotos do hidrômetro
│   └── invoice.css               → anexo de boleto/fatura
├── js/
│   ├── db.js                     → persistência (IndexedDB) — leituras + fotos + faturas
│   ├── photo-utils.js           → compressão de imagens / leitura de arquivos
│   ├── rateio-logic.js          → regras de cálculo do rateio (puro, sem DOM)
│   ├── formatters.js            → formatação de datas/moeda
│   ├── charts.js                  → gráficos em canvas (sem dependências externas)
│   ├── photos-ui.js              → modal de captura/visualização de foto
│   ├── invoice-ui.js             → modal de anexo/visualização de fatura
│   ├── tab-lancamento.js        → aba Lançamento
│   ├── tab-conferencia.js       → aba Conferência
│   ├── tab-dashboard.js         → aba Dashboard
│   ├── tab-historico.js         → aba Histórico
│   ├── export.js                  → exportação CSV e backup JSON
│   └── app.js                     → orquestrador principal (liga tudo)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Por que essa estrutura?

Cada arquivo tem uma única responsabilidade. Se no futuro for preciso mudar a
fórmula do rateio, só se edita `rateio-logic.js`. Se for preciso mudar a cor
do cabeçalho dos cards, só se edita `floor-cards.css`. Isso evita o efeito
"bola de neve" de patches acumulados que tínhamos na versão anterior em
arquivo único.

## Funcionalidades principais

- **Leitura progressiva**: a leitura anterior de cada unidade é sempre buscada
  cronologicamente na competência salva mais recente — sem depender de um
  cache solto que pudesse ficar desatualizado em lançamentos retroativos.
- **Validação de leitura mínima**: bloqueia o lançamento de uma leitura menor
  que a anterior (hidrômetro só acumula).
- **Fotos do hidrômetro**: cada unidade tem um botão de câmera; a foto fica
  vinculada à unidade + competência, com data/hora de registro (auditoria).
  As imagens são comprimidas automaticamente (~50-100KB) antes de salvar.
- **Anexo de boleto/fatura**: aceita PDF ou imagem do boleto da Águas do Rio,
  vinculado à competência (um por mês). Aparece como indicador visual tanto
  no painel de Lançamento quanto no Histórico, facilitando saber rapidamente
  quais meses já têm o documento fiscal guardado.
- **Conferência de status**: mostra quais unidades estão "Sem Leitura" sem
  precisar redigitar nada — só lê os dados já salvos.
- **Dashboard**: gráficos de consumo/valor/diferença, com visão geral, por
  andar ou por unidade, em recortes mensais ou anuais.
- **Backup completo**: exporta/importa um único arquivo `.json` com todas as
  competências, fotos e faturas — útil para uso multi-dispositivo.

## Como subir para o GitHub Pages (passo a passo)

### 1. Crie um novo repositório no GitHub
- Acesse [github.com/new](https://github.com/new)
- Nome sugerido: `vitale-carioca-rateio`
- Marque como **Public** (necessário para GitHub Pages gratuito)
- Não inicialize com README (já temos um)
- Clique em **Create repository**

### 2. Suba os arquivos
Você pode fazer isso direto pela interface web do GitHub (mais simples) ou via linha de comando.

**Opção A — pela interface web (mais fácil):**
1. Na página do repositório recém-criado, clique em **uploading an existing file**
2. Arraste a pasta `vitale-carioca-pwa` inteira (ou todos os arquivos dela) para a área de upload
   - Importante: a estrutura de pastas (`css/`, `js/`, `icons/`) precisa ser preservada
3. Escreva uma mensagem de commit, ex: "Versão inicial do PWA"
4. Clique em **Commit changes**

**Opção B — via linha de comando (se tiver Git instalado):**
```bash
cd vitale-carioca-pwa
git init
git add .
git commit -m "Versão inicial do PWA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/vitale-carioca-rateio.git
git push -u origin main
```

### 3. Ative o GitHub Pages
1. No repositório, vá em **Settings** (aba no topo)
2. No menu lateral esquerdo, clique em **Pages**
3. Em **Source**, selecione **Deploy from a branch**
4. Em **Branch**, selecione **main** e a pasta **/ (root)**
5. Clique em **Save**
6. Aguarde 1-2 minutos — o GitHub vai mostrar a URL pública, algo como:
   `https://SEU_USUARIO.github.io/vitale-carioca-rateio/`

### 4. Acesse e instale como app
1. Abra a URL acima no celular (Chrome no Android ou Safari no iPhone)
2. **Android (Chrome):** vai aparecer um banner "Adicionar à tela inicial" — ou toque no menu (⋮) → **Instalar app**
3. **iPhone (Safari):** toque no botão de compartilhar (□↑) → **Adicionar à Tela de Início**
4. O app vai aparecer como um ícone normal, abre em tela cheia, funciona offline

## Atualizações futuras

Sempre que precisar alterar algo:
1. Edite o(s) arquivo(s) relevante(s) localmente
2. Suba novamente para o GitHub (upload manual ou `git push`)
3. O GitHub Pages atualiza automaticamente em 1-2 minutos
4. **Importante:** como o app usa Service Worker para cache offline, pode ser necessário que o usuário force a atualização — feche e abra o app novamente, ou no navegador faça um "hard refresh" (Ctrl+Shift+R)

## Backup dos dados

Os dados (leituras, valores, fotos do hidrômetro e faturas anexadas) ficam
salvos no **IndexedDB do navegador**, local ao dispositivo. Use a aba
**Backup** dentro do app para:
- **Exportar**: gera um arquivo `.json` com tudo (inclusive fotos e faturas em base64)
- **Importar**: restaura os dados em outro dispositivo/navegador

Recomendação: exporte o backup mensalmente, após fechar cada competência,
e guarde em local seguro (Google Drive, e-mail, etc.) como segurança extra.

> Atenção: arquivos de fatura muito grandes (acima de 10MB) não são aceitos
> no anexo — nesse caso, comprima o PDF antes de anexar ou recorte a página
> relevante do boleto.
