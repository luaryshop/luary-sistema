# Como atualizar o Luary (site + Firebase)

## 1. Publicar os arquivos
1. Descompacte o zip e envie **todos** os arquivos da pasta `luary-system-main` para o repositório do site no GitHub (substituindo os antigos, incluindo os novos: `carrinho.html`, `checkout.html`, `pedidos.html`, `romaneio.html`, `order-calc.js`, `store-core.js`, `store.css`, `pricing.js`, `cdn.html`, `cdn-lib.js`).
2. Aguarde 1–2 minutos (GitHub Pages) e abra o site com Ctrl+F5.

## 2. Regras do Firestore (obrigatório para pedidos e cupons)
1. Acesse https://console.firebase.google.com → seu projeto → **Firestore Database → Regras**.
2. Abra `firestore.rules.sample`, copie o conteúdo e cole no editor.
3. Troque o e-mail do administrador (`ADMIN_EMAIL_AQUI`) pelo e-mail que você usa para entrar no painel.
4. Clique em **Simular** (Rules Playground) e teste: leitura anônima de `products` (permitida) e de `orders` (negada).
5. Clique em **Publicar**.

## 3. Administradores (Authentication)
Em **Authentication → Users**, confirme que seu e-mail existe. Só ele (o da regra) acessa Pedidos, Conteúdo e Produtos.

## 4. Domínio autorizado
Em **Authentication → Settings → Domínios autorizados**, confirme `luaryshop.github.io`.

## 5. Configurar a loja (painel → Conteúdo do Site)
1. **Empresa e Identidade**: WhatsApp da empresa (com DDD), pedido mínimo, **quantidade mínima por SKU**, desconto PIX, frete. Clique em **Salvar dados**.
2. **Marketplaces**: se a Shopee não estiver na lista, clique em *Cadastrar Shopee no painel*. Cadastre os demais canais.
3. **Banners**: clique em *Cadastrar imagem atual do topo* para poder trocar/excluir a imagem principal. Novos banners: escolha "Carrossel" ou "Imagem de fundo do topo".
4. **Cupons antigos**: abra cada cupom e clique em Salvar de novo (passa a usar o novo formato).
5. **Produtos** (admin.html): preencha "Quantidade mínima" só nos SKUs com mínimo diferente do padrão.

## 6. Testar de ponta a ponta
1. No site, adicione peças, vá em **Meu pedido → Continuar**, preencha e envie.
2. Confira a mensagem no WhatsApp e o pedido em `pedidos.html`.
3. Imprima um romaneio e confira os valores (os preços são calculados no navegador; confira antes de aprovar).

---

## 7. SEO e compartilhamento (Fase 6)
1. Painel → **Conteúdo do Site → SEO e redes sociais**: confira o endereço público da loja, título, descrição e imagem de compartilhamento (JPG 1200×630, publicada na CDN). Salve.
2. **Categorias**: preencha título/descrição SEO e a imagem de cada categoria (opcional). **Produtos**: título/descrição SEO (opcional).
3. Clique em **Baixar pacote SEO (.zip)**, descompacte e envie para a raiz do site no GitHub: `sitemap.xml`, `robots.txt` e a pasta `p/` (uma página por produto, com a prévia do WhatsApp/Facebook).
   Refaça isso quando cadastrar produtos novos ou mudar nome/foto/descrição.
4. Volte em SEO e marque **"Já publiquei as páginas de compartilhamento"** para o botão *Compartilhar* usar o link `p/SKU.html`.
5. Google: em https://search.google.com/search-console adicione o site e envie o `sitemap.xml`.
6. Teste a prévia: cole o link de um produto no WhatsApp, ou use https://developers.facebook.com/tools/debug/ (clique em "Coletar novamente" após mudanças).

Observações: o GitHub Pages de projeto (`usuario.github.io/projeto`) só aceita `robots.txt` na raiz do domínio; com domínio próprio ele passa a valer. Fotos em WebP podem não aparecer em algumas redes — por isso a imagem padrão é JPG; para a prévia de produtos, prefira também publicar uma versão JPG da foto principal.
