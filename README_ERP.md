# Luary Shop ERP — Integração com Marketplaces

Um sistema ERP fullstack completo para gerenciar produtos, estoque, pedidos e integrações com múltiplos marketplaces (Mercado Livre, Shopee, Amazon, TikTok Shop).

## 🚀 Funcionalidades Principais

### 1. **Autenticação OAuth2**
- Fluxo OAuth2 para cada marketplace (Mercado Livre, Shopee, Amazon, TikTok Shop)
- Tokens armazenados de forma segura (criptografados no banco de dados)
- Refresh automático de tokens antes da expiração

### 2. **Gerenciamento de Produtos**
- Criar, editar e deletar produtos
- Publicar produtos em um ou múltiplos marketplaces
- Sincronização de preços e estoque em tempo real
- Histórico de sincronizações com logs de sucesso/erro

### 3. **Sincronização de Estoque**
- Atualização bidirecional de estoque
- Importação automática de vendas dos marketplaces
- Controle de estoque mínimo

### 4. **Gerenciamento de Pedidos**
- Importação automática de pedidos de todos os marketplaces
- Visualização centralizada de pedidos
- Rastreamento de status de pedidos
- Detalhes completos de itens por pedido

### 5. **Dashboard de Integrações**
- Status de conexão de cada marketplace
- Última sincronização
- Erros e logs de atividade
- Estatísticas gerais (produtos, pedidos, marketplaces conectados)

### 6. **Arquitetura Extensível**
- Padrão Adapter para fácil adição de novos marketplaces
- Interface padronizada `IMarketplaceAdapter`
- Factory de adaptadores para gerenciar múltiplos canais

## 📁 Estrutura do Projeto

```
luary-shop-marketplace/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Página inicial com navegação
│   │   │   ├── Dashboard.tsx       # Dashboard de integrações
│   │   │   ├── Products.tsx        # Gerenciamento de produtos
│   │   │   ├── Orders.tsx          # Gerenciamento de pedidos
│   │   │   └── Marketplaces.tsx    # Conexão de marketplaces
│   │   ├── components/             # Componentes reutilizáveis
│   │   └── lib/                    # Utilitários e configurações
│   └── index.html
├── server/                          # Backend Node.js/Express
│   ├── adapters/                   # Adaptadores de marketplace
│   │   ├── types.ts                # Interface base
│   │   ├── BaseAdapter.ts          # Classe abstrata
│   │   ├── MercadoLivreAdapter.ts
│   │   ├── ShopeeAdapter.ts
│   │   ├── AmazonAdapter.ts
│   │   ├── TikTokAdapter.ts
│   │   └── AdapterFactory.ts       # Factory de adaptadores
│   ├── services/                   # Serviços de negócio
│   │   ├── encryption.ts           # Criptografia de tokens
│   │   ├── marketplaceService.ts   # Gerenciamento de conexões
│   │   ├── productSyncService.ts   # Sincronização de produtos
│   │   └── orderSyncService.ts     # Sincronização de pedidos
│   ├── routers/                    # Procedures tRPC
│   │   ├── marketplace.ts
│   │   ├── products.ts
│   │   └── orders.ts
│   ├── db.ts                       # Query helpers
│   └── routers.ts                  # Router principal
├── drizzle/                         # Banco de dados
│   ├── schema.ts                   # Definição de tabelas
│   └── migrations/                 # Migrations SQL
├── shared/                          # Código compartilhado
└── package.json
```

## 🗄️ Banco de Dados

### Tabelas Principais

- **users**: Usuários do sistema
- **marketplace_connections**: Conexões OAuth com marketplaces
- **products**: Produtos do ERP
- **marketplace_listings**: Anúncios publicados nos marketplaces
- **orders**: Pedidos importados dos marketplaces
- **order_items**: Itens dentro de cada pedido
- **sync_logs**: Histórico de sincronizações
- **insumos**: Insumos/componentes (para cálculo de custo)
- **banhos**: Banhos/tratamentos (para cálculo de preço)
- **kits**: Kits de produtos
- **financeiro**: Dados financeiros

## 🔐 Segurança

- Tokens de marketplace criptografados no banco de dados
- Variáveis de ambiente para credenciais sensíveis
- Autenticação OAuth2 para cada marketplace
- Isolamento de dados por usuário
- Validação de entrada com Zod

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` com as variáveis necessárias:

```env
DATABASE_URL=mysql://user:password@localhost:3306/luary_shop
JWT_SECRET=seu_secret_aqui
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
```

### 3. Executar Migrations

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 4. Iniciar o Servidor

```bash
# Desenvolvimento
pnpm dev

# Produção
pnpm build
pnpm start
```

## 🔌 Adicionar Novo Marketplace

Para adicionar um novo marketplace (ex: B2Brazil):

1. **Criar adaptador** em `server/adapters/B2BrazilAdapter.ts`:

```typescript
import { BaseMarketplaceAdapter } from "./BaseAdapter";
import { PublishProductPayload, UpdatePricePayload, UpdateStockPayload } from "./types";

export class B2BrazilAdapter extends BaseMarketplaceAdapter {
  async publishProduct(accessToken: string, payload: PublishProductPayload) {
    // Implementar publicação
  }

  async updatePrice(accessToken: string, payload: UpdatePricePayload) {
    // Implementar atualização de preço
  }

  async updateStock(accessToken: string, payload: UpdateStockPayload) {
    // Implementar atualização de estoque
  }

  async getOrders(accessToken: string, options?: any) {
    // Implementar importação de pedidos
  }

  async getAuthorizationUrl(clientId: string, redirectUri: string): Promise<string> {
    // Implementar geração de URL OAuth
  }

  async exchangeCodeForToken(code: string, clientId: string, clientSecret: string) {
    // Implementar troca de código por token
  }

  async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
    // Implementar refresh de token
  }
}
```

2. **Registrar na factory** em `server/adapters/AdapterFactory.ts`:

```typescript
import { B2BrazilAdapter } from "./B2BrazilAdapter";

export type SupportedMarketplace = "mercadolivre" | "shopee" | "amazon" | "tiktok" | "b2brazil";

private static adapters: Map<SupportedMarketplace, ...> = new Map([
  // ... outros adaptadores
  ["b2brazil", B2BrazilAdapter],
]);
```

3. **Atualizar schema** em `drizzle/schema.ts` se necessário

## 📊 API Endpoints (tRPC)

### Marketplace
- `marketplace.getConnections()` - Listar conexões
- `marketplace.getAuthorizationUrl(type)` - Gerar URL OAuth
- `marketplace.handleOAuthCallback(type, code)` - Processar callback
- `marketplace.disconnect(type)` - Desconectar marketplace
- `marketplace.getSupportedMarketplaces()` - Listar marketplaces suportados

### Products
- `products.list()` - Listar produtos
- `products.get(id)` - Obter produto
- `products.create(data)` - Criar produto
- `products.update(id, data)` - Atualizar produto
- `products.publishToMarketplace(productId, marketplaceType)` - Publicar em um marketplace
- `products.publishToAllMarketplaces(productId)` - Publicar em todos
- `products.updatePrice(listingId, marketplaceConnectionId, newPrice)` - Atualizar preço
- `products.updateStock(listingId, marketplaceConnectionId, newStock)` - Atualizar estoque
- `products.getSyncHistory(productId?, limit)` - Histórico de sincronizações

### Orders
- `orders.list(limit)` - Listar pedidos
- `orders.getItems(orderId)` - Obter itens de um pedido
- `orders.importFromMarketplace(marketplaceType, since?)` - Importar de um marketplace
- `orders.importFromAllMarketplaces(since?)` - Importar de todos
- `orders.updateStatus(orderId, newStatus)` - Atualizar status

## 🧪 Testes

```bash
pnpm test
```

## 📝 Documentação

Para mais informações sobre a arquitetura e fluxos, consulte:
- `server/adapters/types.ts` - Interface de adaptadores
- `drizzle/schema.ts` - Estrutura do banco de dados
- `server/services/` - Lógica de negócio

## 🤝 Contribuindo

Para adicionar novas funcionalidades ou marketplaces, siga o padrão de arquitetura estabelecido e mantenha a compatibilidade com a interface `IMarketplaceAdapter`.

## 📄 Licença

MIT
