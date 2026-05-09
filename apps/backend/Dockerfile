FROM node:20-alpine AS base
WORKDIR /app
# Prisma requires openssl on Alpine
RUN apk add --no-cache openssl

FROM base AS deps
COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

FROM deps AS build
COPY . .
# Generate the Prisma client which pulls down query engines
RUN npm --workspace apps/backend run prisma:generate

# Build the Webpack bundle
RUN npm --workspace apps/backend run build

# KEY FIX: Webpack bundles main.js but strips out the Prisma query-engine binary. 
# We copy it manually. Prisma searches in /app (because Webpack rewrites __dirname to /app or /).
RUN cp node_modules/.prisma/client/libquery_engine-*.so.node apps/backend/dist/ 2>/dev/null || true

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
# We copy the engine to /app since Prisma searches there at runtime
COPY --from=build /app/apps/backend/dist/libquery_engine-linux-musl-openssl-3.0.x.so.node /app/
COPY --from=build /app/apps/backend/prisma ./prisma
COPY apps/backend/package.json ./
EXPOSE 4000
# Sync schema then start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main.js"]
