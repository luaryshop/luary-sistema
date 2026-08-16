# Status do Projeto — o que está pronto e o que falta

## ✅ Pronto e testado (build, typecheck e 12 testes automatizados passando)

- **Cadastros internos do ERP** — Produtos, Insumos, Banhos, Kits, Financeiro: CRUD completo, validado, com isolamento por usuário e testes automatizados.
- **Login independente** — senha própria, sem depender de nenhum serviço externo.
- **Banco de dados** — migrations corrigidas e testadas do zero em MySQL/MariaDB padrão (havia um bug de nome de chave estrangeira grande demais que travava a criação das tabelas — corrigido).
- **Conexão OAuth com marketplaces** — corrigi dois bugs reais que impediam o fluxo de funcionar de ponta a ponta:
  - O link de retorno (`redirect_uri`) apontava para um endereço que não existia no servidor.
  - O `state` (proteção contra CSRF) era gerado mas nunca validado no retorno — agora é validado de verdade, com expiração de 10 minutos.
  - Também implementei a gravação dos itens de cada pedido importado (antes era pulada por uma limitação técnica não resolvida).

## 🟡 Existe, mas é simplificado (funciona, com ressalvas conhecidas)

- **Mapeamento de categoria para Mercado Livre e Shopee** — hoje usa um valor fixo de exemplo (`MLB123456` / categoria `0`) em vez de mapear a categoria real do seu produto para a categoria correta do marketplace. Isso significa que, ao publicar um produto, ele pode cair numa categoria genérica errada até esse mapeamento ser implementado.
- **Mapeamento de atributos** (tamanho, cor, material etc.) para os marketplaces — parcialmente implementado, com margem para melhorias.

## 🔴 Ainda não implementado (conforme o próprio roadmap do projeto)

Isso não é falha minha nem sua — é o estado real em que o projeto foi gerado, documentado no `todo.md` que já vinha com ele:

- **OAuth de Shopee, Amazon e TikTok Shop**: os adaptadores (arquivos que sabem "conversar" com a API de cada um) existem e têm bastante código, mas nunca foram testados contra as APIs reais desses marketplaces — só o Mercado Livre foi validado nesse nível.
- **Sincronização de estoque automática** com os marketplaces (avisar automaticamente quando o estoque muda) — não implementada para nenhum marketplace ainda.
- **Publicação em massa de produtos** (mandar vários produtos de uma vez para os marketplaces) — não implementada; hoje seria produto por produto.
- **Atualização de preço em tempo real** nos marketplaces — não implementada.
- **Webhooks** (marketplace avisando o sistema em tempo real quando vende algo) — não implementado; hoje a importação de pedidos depende de rodar a sincronização manualmente.
- **Dashboard de status das integrações** (ver de relance o que está sincronizado, com erro, etc.) — não implementado.

## O que eu recomendo como próximos passos, em ordem

1. **Coloque no ar e use o ERP interno primeiro** (produtos, insumos, banhos, kits, financeiro) — essa parte está completa e testada, já resolve boa parte do dia a dia.
2. **Conecte o Mercado Livre** — é o marketplace mais maduro no código hoje. Eu corrigi os bugs que impediam a conexão funcionar; o fluxo de autorização deve funcionar agora.
3. **Antes de publicar produtos de verdade no Mercado Livre**, vale ajustar o mapeamento de categoria (hoje fixo) — posso te ajudar com isso quando for a hora.
4. **Shopee/Amazon/TikTok**: dá pra tentar conectar (o fluxo de OAuth agora está correto), mas espere precisar de ajustes nos adaptadores específicos de cada um até funcionar de ponta a ponta — eles não foram testados contra as APIs reais ainda.
