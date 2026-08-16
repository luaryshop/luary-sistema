# Deploy do Luary Shop ERP — 100% independente (sem Manus)

Este projeto foi ajustado para rodar de forma totalmente independente da plataforma Manus:
- O login agora usa senha própria (variável `ADMIN_PASSWORD`), não depende mais de `api.manus.im`.
- Corrigido um bug de migration (nome de chave estrangeira maior que 64 caracteres, que travava a criação do banco em MySQL/MariaDB padrão).
- Testado localmente de ponta a ponta: banco criado, login funcionando, sessão autenticada, endpoints protegidos respondendo.

As integrações reais (Mercado Livre, Shopee, Amazon, TikTok Shop) continuam exatamente como estavam — elas nunca dependeram da Manus, só de credenciais de cada marketplace.

## Por que não dá pra usar GitHub Pages

Esse projeto tem um **servidor** (Node.js/Express + tRPC) que precisa ficar rodando o tempo todo, mais um **banco de dados MySQL**. GitHub Pages só serve arquivos estáticos (HTML/CSS/JS prontos), não roda servidor nem banco. Por isso o caminho aqui é diferente do que usamos no outro projeto (Firebase).

## Caminho recomendado: Railway

Railway hospeda o servidor **e** o banco MySQL juntos, com deploy automático a partir do GitHub. É o mais simples para esse tipo de projeto.

### 1. Suba o projeto pro GitHub
Crie um repositório novo (ex: `luary-sistema`) e suba todo este projeto (o `.gitignore` já protege `.env` e `node_modules`).

### 2. Crie o banco de dados
1. Acesse **railway.app** → **New Project** → **Provision MySQL**
2. Depois de criado, clique no serviço MySQL → aba **Variables** → copie o valor de `MYSQL_URL` (ou monte a partir de `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`). Isso vai virar sua `DATABASE_URL`.

### 3. Crie o serviço do servidor
1. No mesmo projeto Railway → **New** → **GitHub Repo** → selecione o repositório que você acabou de subir
2. Railway detecta automaticamente que é Node.js
3. Em **Settings > Build**, confirme:
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `pnpm run start`
4. Em **Variables**, adicione (uma por linha, formato `CHAVE=valor`):

```
DATABASE_URL=<a MYSQL_URL que você copiou no passo 2>
JWT_SECRET=<gere uma string aleatória de 32+ caracteres>
ENCRYPTION_KEY=<exatamente 32 caracteres>
ADMIN_PASSWORD=<a senha que você vai usar pra entrar no sistema>
OWNER_NAME=Luary Admin
NODE_ENV=production
```

> Dica para gerar `JWT_SECRET` e `ENCRYPTION_KEY` com segurança: no terminal do Codespace, rode `openssl rand -hex 32` (copie os primeiros 32 caracteres para o `ENCRYPTION_KEY`, e pode usar a string toda para o `JWT_SECRET`).

### 4. Rode as migrations (criar as tabelas no banco)
No painel do Railway, abra o serviço do servidor → aba **Settings** → seção "Deploy" tem um botão de terminal, OU rode localmente no Codespace apontando pro banco do Railway:
```bash
DATABASE_URL="<a mesma URL do passo 2>" npx drizzle-kit migrate
```

### 5. Gerar um domínio público
No serviço do servidor → **Settings > Networking > Generate Domain**. Railway te dá um link tipo `https://luary-sistema-production.up.railway.app`.

### 6. Acessar
Abra o link gerado, digite a senha que você colocou em `ADMIN_PASSWORD`, e pronto — sistema no ar.

## Alternativa: Render + PlanetScale/TiDB Cloud
Se preferir, o mesmo passo a passo funciona trocando Railway por **Render** (Web Service, mesmo Build/Start Command) para o servidor, e **TiDB Cloud** (tem plano gratuito, compatível com MySQL) para o banco. A única diferença prática é onde você pega a `DATABASE_URL`.

## Ativando os marketplaces (opcional, quando for usar de verdade)
Cada marketplace (Mercado Livre, Shopee, Amazon, TikTok Shop) exige que você crie um app de desenvolvedor no portal deles e preencha as variáveis correspondentes no `env.sample.txt`. Isso é independente do login do sistema — sem preencher, o ERP funciona normalmente, só a sincronização automática com aquele marketplace específico fica desativada.
