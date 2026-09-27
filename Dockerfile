FROM node:22-bookworm-slim

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json ./apps/web/

RUN cd apps/web && npm ci

COPY apps/web ./apps/web
COPY contracts/deployments/blockdag.json ./contracts/deployments/blockdag.json

WORKDIR /app/apps/web

ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_EXPLORER_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_EXPLORER_URL=$NEXT_PUBLIC_EXPLORER_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

CMD ["sh", "-c", "npm start"]
