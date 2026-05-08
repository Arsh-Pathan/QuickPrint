FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm --workspace apps/backend run prisma:generate
RUN npm --workspace apps/backend run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/packages/shared ./packages/shared
COPY apps/backend/package.json ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
