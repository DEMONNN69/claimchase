FROM node:20-slim AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- Proxy server stage ----
FROM node:20-slim AS proxy

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

COPY proxy-server.js ./

EXPOSE 3001
CMD ["node", "proxy-server.js"]