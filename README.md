# 💧 Rateio de Água — Condomínio Vitale Carioca

Sistema de rateio de custos de água desenvolvido para o Condomínio Vitale Carioca (96 unidades, 12 andares). Hospedado como Progressive Web App (PWA) no GitHub Pages — instalável no celular, funciona offline, sem servidor.

🔗 **App ao vivo:** https://luizfsbessa.github.io/vitale-carioca-rateio/

---

## 🧮 Como funciona o rateio

A Águas do Rio fornece uma leitura geral do consumo do prédio. Cada unidade tem seu próprio hidrômetro com leitura acumulada. O sistema calcula:

```
Valor por m³ = Fatura total ÷ Consumo total (Águas do Rio)
Consumo individual = Leitura atual − Leitura anterior
Diferença = Consumo total − Soma das leituras individuais
Rateio por unidade = Diferença ÷ 96
Valor da unidade = (Consumo individual + Rateio) × Valor por m³
```

A diferença entre a leitura geral e a soma das individuais representa consumo de áreas comuns, perdas na rede e variações de medição — rateada igualmente entre todas as unidades.

---

## ✨ Funcionalidades

### 📋 Lançamento
- Grid por andar (12 andares × 8 unidades)
- Leitura **acumulada** do hidrômetro por unidade
- Validação: bloqueia leitura inferior à anterior
- Leitura anterior buscada cronologicamente no histórico (lançamentos retroativos não corrompem dados futuros)
- Botão 📷 para foto do hidrômetro (auditoria com data/hora)
- Banner informativo sobre leitura acumulada vs. consumo

### ✅ Conferência
- Status de lançamento por unidade sem redigitar nada
- Cards por andar com indicador % de progresso
- Filtros: todas / lançadas / sem leitura
- Valor segregado: individual + rateio da diferença + total

### 📊 Dashboard
- Gráficos em Canvas nativo (sem Chart.js)
- Visão geral, por andar ou por unidade
- Recortes mensais e anuais
- Rankings top 20 maior/menor consumo

### 📅 Histórico
- Todas as competências salvas com detalhes por unidade
- Indicador de fatura anexada
- Edição retroativa e exportação CSV por mês

### 👤 Condôminos
- Cadastro de nome, WhatsApp e e-mail por unidade
- Import/Export CSV (aceita vírgula ou ponto e vírgula)
- Botão 📤 de envio por unidade

### 📤 Envio do extrato
- **PDF individual** gerado nativamente (Canvas → JPEG → PDF binário, sem bibliotecas)
- Identidade visual completa da marca Vitale Carioca
- **WhatsApp**: PDF baixa + abre WhatsApp com mensagem pré-formatada
- **E-mail automático** via EmailJS com layout HTML (gratuito até 250/mês)

### 📎 Fatura / Boleto
- Anexo do boleto da Águas do Rio por competência (PDF ou imagem)
- Aparece como indicador verde no Histórico

### 💾 Backup
- Export/Import JSON completo (leituras + fotos + faturas + condôminos)
- Fotos comprimidas automaticamente (~80KB) antes de salvar

---

## 🗂️ Estrutura do projeto

```
vitale-carioca-rateio/
├── index.html              → HTML principal
├── manifest.json           → Configuração PWA
├── service-worker.js       → Cache offline (v4)
├── css/
│   ├── base.css            → Variáveis de design, reset
│   ├── header.css          → Logo e painel de competência
│   ├── tabs.css            → Abas e botões
│   ├── floor-cards.css     → Cards de andar
│   ├── tables.css          → Tabelas, histórico, badges
│   ├── dashboard.css       → Gráficos e rankings
│   ├── photos.css          → Captura/galeria de fotos
│   ├── invoice.css         → Anexo de fatura
│   └── condominios.css     → Aba de condôminos e modal de envio
├── js/
│   ├── db.js               → IndexedDB (competências + fotos + faturas + condôminos)
│   ├── photo-utils.js      → Compressão de imagens
│   ├── rateio-logic.js     → Regras de cálculo (puro, sem DOM)
│   ├── formatters.js       → Formatação de datas e moeda
│   ├── charts.js           → Gráficos Canvas nativos
│   ├── photos-ui.js        → Modal de foto do hidrômetro
│   ├── invoice-ui.js       → Modal de fatura/boleto
│   ├── tab-lancamento.js   → Aba Lançamento
│   ├── tab-conferencia.js  → Aba Conferência
│   ├── tab-dashboard.js    → Aba Dashboard
│   ├── tab-historico.js    → Aba Histórico
│   ├── tab-condominios.js  → Aba Condôminos
│   ├── pdf-generator.js    → Geração de PDF nativo
│   ├── share-modal.js      → Modal de envio (WhatsApp + E-mail)
│   ├── emailjs-sender.js   → Integração EmailJS
│   ├── export.js           → CSV e backup JSON
│   └── app.js              → Orquestrador principal
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 🚀 Como usar

### Fluxo mensal
1. Selecione a **competência** (mês/ano) no topo
2. Informe o **consumo total (m³)** e **valor da fatura** da Águas do Rio
3. Na aba **Lançamento**, insira a leitura acumulada do hidrômetro de cada unidade
4. Use a aba **Conferência** para verificar pendências sem redigitar nada
5. Clique em **Fechar competência e salvar**
6. Na aba **Condôminos**, clique em 📤 para enviar o extrato por WhatsApp ou e-mail

### Instalação como app (PWA)
- **Android (Chrome):** menu ⋮ → "Instalar app" ou banner automático
- **iPhone (Safari):** botão compartilhar □↑ → "Adicionar à Tela de Início"

### Configuração do e-mail (EmailJS)
1. Crie conta em [emailjs.com](https://www.emailjs.com) (gratuito, 250/mês)
2. Conecte seu Gmail em **Email Services** → copie o **Service ID**
3. Crie um template em **Email Templates** → copie o **Template ID**
4. Em **Account → API Keys** → copie a **Public Key**
5. No app → aba **Condôminos** → **⚙️ Config e-mail** → cole os valores e salve

---

## 💾 Backup dos dados

Os dados ficam no **IndexedDB do navegador** (local ao dispositivo). Use a aba **Backup** para exportar um `.json` com tudo e importar em outro dispositivo.

> Recomendação: exporte mensalmente após fechar cada competência.

---

## 🛠️ Tecnologias

- **HTML5 / CSS3 / JavaScript ES2020** — sem frameworks
- **IndexedDB** — persistência local robusta
- **Canvas 2D API** — gráficos e geração de PDF
- **Service Worker** — cache offline e instalação PWA
- **EmailJS** — envio de e-mail sem servidor
- **GitHub Pages** — hospedagem gratuita

---

## 📄 Licença

MIT — livre para uso, modificação e distribuição.

---

*Powered by Luiz Bessa*
