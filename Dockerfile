# Build
FROM node:20-slim AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Runtime (imagem final, mais leve)
FROM node:20-slim AS runtime
WORKDIR /app

RUN corepack enable
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist

# Cloud Run injeta a variável PORT automaticamente; o servidor já lê ENV.port via process.env.PORT
EXPOSE 8080
CMD ["node", "dist/index.js"]
