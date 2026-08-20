# Deploy no Google Cloud (Cloud SQL + Cloud Run)

Como você já tem uma conta paga no Firebase, este caminho usa a **mesma conta/projeto Google Cloud** por baixo dele — não precisa criar cadastro em outro serviço.

Duas peças, ambas dentro do Google Cloud:
- **Cloud SQL** → o banco de dados MySQL (substitui o Railway)
- **Cloud Run** → onde o servidor do sistema roda (não existe no Firebase puro, por isso precisamos dele)

## 1. Abrir o Console do Google Cloud

Acesse **console.cloud.google.com** e selecione, no topo da página, o **mesmo projeto** que já é usado pelo seu Firebase (o nome costuma ser igual ao do projeto Firebase, ex: `luary-shop`).

## 2. Criar o banco (Cloud SQL)

1. No menu esquerdo (ou busca no topo), vá em **SQL**
2. Clique **Criar instância** → escolha **MySQL**
3. Configure:
   - **ID da instância**: `luary-sistema-db`
   - **Senha do usuário root**: crie uma senha forte e **anote** (vai precisar depois)
   - **Versão do banco de dados**: MySQL 8.0
   - **Região**: escolha uma perto de você (ex: `southamerica-east1` para São Paulo)
   - **Edição/Máquina**: pode escolher a opção mais simples/barata (Sandbox ou a menor configuração disponível) — esse sistema não exige muito poder de processamento
4. Clique **Criar instância** (leva alguns minutos)
5. Depois de criada, clique nela → aba **Bancos de dados** → **Criar banco de dados** → nome `luary_shop`
6. Anote o **"Nome da conexão"** que aparece no topo da página da instância — tem o formato `SEU-PROJETO:REGIAO:luary-sistema-db`. Vai precisar dele mais adiante.

## 3. Subir o projeto pro GitHub

Igual sempre: crie um repositório novo (ex: `luary-sistema`) e suba todo este projeto.

## 4. Criar o servidor (Cloud Run)

1. No Console do Google Cloud, vá em **Cloud Run**
2. Clique **Criar serviço**
3. Escolha **Fazer deploy contínuo a partir de um repositório** → conecte sua conta do GitHub → selecione o repositório `luary-sistema`
4. Quando pedir o tipo de build, escolha **Dockerfile** (já está incluso no projeto)
5. Em **Configurações do contêiner > Variáveis e Secrets**, adicione:

```
DATABASE_URL=mysql://root:SUA_SENHA_DO_PASSO_2@localhost/luary_shop?socketPath=/cloudsql/SEU-PROJETO:REGIAO:luary-sistema-db
JWT_SECRET=<gere uma string aleatória de 32+ caracteres>
ENCRYPTION_KEY=<exatamente 32 caracteres>
ADMIN_PASSWORD=<a senha que você vai usar pra entrar no sistema>
OWNER_NAME=Luary Admin
NODE_ENV=production
```

> Troque `SUA_SENHA_DO_PASSO_2` pela senha do root que você criou, e `SEU-PROJETO:REGIAO:luary-sistema-db` pelo "Nome da conexão" que você anotou no passo 2.6.

6. Ainda nas configurações do serviço, procure **Conexões > Conexões do Cloud SQL** e selecione a instância `luary-sistema-db` que você criou — isso é o que permite o `socketPath` acima funcionar.
7. Clique **Criar**. O Google Cloud vai buildar a imagem Docker e publicar automaticamente.

## 5. Rodar as migrations (criar as tabelas)

A forma mais simples é usar o **Cloud Shell** (terminal no navegador, já vem pronto no Console do Google Cloud, sem precisar instalar nada):

1. No Console, clique no ícone de terminal (`>_`) no canto superior direito — abre o Cloud Shell
2. Rode:
```bash
git clone https://github.com/SEU-USUARIO/luary-sistema.git
cd luary-sistema
corepack enable
pnpm install
```
3. Instale o Cloud SQL Auth Proxy (permite o Cloud Shell falar com o banco):
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy SEU-PROJETO:REGIAO:luary-sistema-db &
```
4. Rode as migrations apontando pro proxy local:
```bash
DATABASE_URL="mysql://root:SUA_SENHA@127.0.0.1:3306/luary_shop" npx drizzle-kit migrate
```

## 6. Acessar

No serviço do Cloud Run, a URL pública aparece no topo da página (formato `https://luary-sistema-xxxxx.run.app`). Abra, digite a senha do `ADMIN_PASSWORD`, e pronto.

## Sobre custo

Cloud SQL e Cloud Run cobram por uso — como o Firebase Blaze que você já usa. Para um sistema de uso pessoal/pequena equipe, o custo tende a ficar baixo (Cloud Run só cobra quando alguém está de fato acessando; a instância pequena de Cloud SQL tem custo mensal fixo, mas modesto). Vale acompanhar os primeiros dias no painel de faturamento do Google Cloud pra ter uma noção real do valor no seu caso.
