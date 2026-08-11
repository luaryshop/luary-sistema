# Luary Shop — Integração com Marketplaces (TODO)

## Fase 1: Arquitetura de Adaptadores e Banco de Dados
- [x] Criar schema Drizzle para marketplaces, credenciais, produtos sincronizados, pedidos e histórico de sincronizações
- [x] Implementar estrutura de adaptadores (adapter pattern) com interface padronizada
- [x] Criar adaptador base abstrato para Mercado Livre
- [ ] Criar adaptador base abstrato para Shopee
- [ ] Criar adaptador base abstrato para Amazon
- [ ] Criar adaptador base abstrato para TikTok Shop
- [x] Implementar factory de adaptadores para extensibilidade

## Fase 2: Autenticação OAuth2 e Gerenciamento de Credenciais
- [x] Implementar fluxo OAuth2 para Mercado Livre
- [ ] Implementar fluxo OAuth2 para Shopee
- [ ] Implementar fluxo OAuth2 para Amazon
- [ ] Implementar fluxo OAuth2 para TikTok Shop
- [x] Criar sistema de armazenamento seguro de tokens (criptografia no banco)
- [x] Implementar refresh automático de tokens
- [x] Criar tela de conexão de marketplaces com fluxo OAuth
- [x] Criar tela de gerenciamento de credenciais

## Fase 3: Sincronização de Produtos e Publicação
- [ ] Implementar publicação de produto único no marketplace
- [ ] Implementar publicação em massa de produtos
- [ ] Criar mapeamento de campos entre ERP e cada marketplace
- [ ] Implementar upload de fotos para cada marketplace
- [ ] Implementar atualização de anúncio existente
- [ ] Criar fila de processamento para publicações (Bull/Redis ou similar)
- [ ] Implementar retry automático com backoff exponencial

## Fase 4: Sincronização de Estoque e Importação de Pedidos
- [ ] Implementar sincronização de estoque para Mercado Livre
- [ ] Implementar sincronização de estoque para Shopee
- [ ] Implementar sincronização de estoque para Amazon
- [ ] Implementar sincronização de estoque para TikTok Shop
- [ ] Implementar importação de pedidos para Mercado Livre
- [ ] Implementar importação de pedidos para Shopee
- [ ] Implementar importação de pedidos para Amazon
- [ ] Implementar importação de pedidos para TikTok Shop
- [ ] Criar webhooks para receber eventos de vendas em tempo real
- [ ] Implementar polling como fallback para webhooks

## Fase 5: Atualização de Preços e Dashboard de Integrações
- [ ] Implementar atualização de preço em tempo real para Mercado Livre
- [ ] Implementar atualização de preço em tempo real para Shopee
- [ ] Implementar atualização de preço em tempo real para Amazon
- [ ] Implementar atualização de preço em tempo real para TikTok Shop
- [ ] Criar dashboard de status de integrações
- [ ] Implementar visualização de últimas sincronizações
- [ ] Implementar visualização de erros e logs
- [ ] Criar painel de atividade por canal

## Fase 6: Migração do Frontend Luary Shop
- [ ] Migrar módulo de Produtos
- [ ] Migrar módulo de Insumos
- [ ] Migrar módulo de Banhos
- [ ] Migrar módulo de Kits
- [ ] Migrar módulo de Marketplaces (expandido com integração)
- [ ] Migrar módulo de Estoque
- [ ] Migrar módulo de Financeiro
- [ ] Migrar módulo de SEO
- [ ] Migrar módulo de Live Stream
- [ ] Migrar Dashboard Executivo
- [ ] Implementar autenticação real (substituir anônima)
- [ ] Adaptar fluxos para tRPC

## Fase 7: Histórico de Sincronizações e Tratamento de Erros
- [ ] Criar tabela de histórico de sincronizações
- [ ] Implementar logging detalhado de cada operação
- [ ] Criar visualização de histórico com filtros
- [ ] Implementar reprocessamento de itens com erro
- [ ] Criar alertas para falhas críticas
- [ ] Implementar retry automático com estratégia inteligente

## Fase 8: Testes, Documentação e Entrega
- [ ] Escrever testes unitários para adaptadores
- [ ] Escrever testes de integração para sincronizações
- [ ] Criar documentação de API
- [ ] Criar guia de configuração de marketplaces
- [ ] Criar guia de uso do sistema
- [ ] Realizar testes end-to-end
- [ ] Preparar checkpoint final
