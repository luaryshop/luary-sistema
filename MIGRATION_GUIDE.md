# Guia de Migração e Configuração — Luary Shop ERP

Este documento orienta a migração do projeto **Luary Shop ERP** para o seu repositório GitHub e sua configuração em ambiente de produção (incluindo integração com Firebase, MySQL/TiDB e Marketplaces).

---

## 1. Pré-requisitos de Ambiente

- **Node.js**: Versão 20 ou superior recomendada.
- **Gerenciador de pacotes**: `pnpm` (versão 9 ou 10).
- **Banco de Dados**: Instância MySQL 8+ ou TiDB (compatível com Drizzle ORM).

---

## 2. Configuração de Variáveis de Ambiente

O projeto utiliza um arquivo `.env` para gerenciar segredos e credenciais. Nunca versione seu arquivo `.env` no Git. Utilize o modelo abaixo como base para criar o seu próprio `.env` na raiz do projeto:

```env
# Banco de Dados (MySQL / TiDB)
DATABASE_URL=mysql://usuario:senha@host:3306/nome_do_banco

# Chaves de Criptografia e Sessão
JWT_SECRET=sua_chave_jwt_super_secreta_com_pelo_menos_32_caracteres
ENCRYPTION_KEY=sua_chave_aes_256_com_32_bytes_para_tokens_oauth

# Configuração Firebase / Autenticação
VITE_APP_ID=seu_app_id_firebase
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
OWNER_OPEN_ID=seu_owner_open_id
OWNER_NAME=Luary Admin

# Chaves dos Marketplaces (Opcional - Ative apenas os canais utilizados)
MERCADOLIVRE_CLIENT_ID=seu_client_id
MERCADOLIVRE_CLIENT_SECRET=seu_client_secret
MERCADOLIVRE_REDIRECT_URI=https://seu-dominio.com/api/marketplace/callback

SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_CLIENT_SECRET=seu_client_secret
SHOPEE_REDIRECT_URI=https://seu-dominio.com/api/marketplace/callback

AMAZON_CLIENT_ID=seu_client_id
AMAZON_CLIENT_SECRET=seu_client_secret
AMAZON_REDIRECT_URI=https://seu-dominio.com/api/marketplace/callback

TIKTOK_CLIENT_ID=seu_client_id
TIKTOK_CLIENT_SECRET=seu_client_secret
TIKTOK_REDIRECT_URI=https://seu-dominio.com/api/marketplace/callback
```

---

## 3. Passo a Passo para Inicialização Local e Deploy

1. **Instalar Dependências:**
   ```bash
   pnpm install
   ```
2. **Aplicar Migrações no Banco de Dados:**
   ```bash
   pnpm db:push
   ```
3. **Executar Testes Automatizados:**
   ```bash
   pnpm test --run
   ```
4. **Gerar Build de Produção:**
   ```bash
   pnpm build
   ```
5. **Iniciar Servidor de Produção:**
   ```bash
   pnpm start
   ```

---

## 4. Publicação no GitHub

1. Crie um repositório privado em [github.com/new](https://github.com/new) sem arquivos iniciais (`README` ou `.gitignore`).
2. Na pasta raiz do projeto extraído, execute:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Luary Shop ERP complete migration"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/luary-shop-marketplace.git
   git push -u origin main
   ```
