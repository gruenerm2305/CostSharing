FROM --platform=$BUILDPLATFORM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

FROM deps AS builder

COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM --platform=$TARGETPLATFORM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["npm", "run", "start:prod"]