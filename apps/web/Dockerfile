FROM node:20-alpine AS builder
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
RUN npm install -g npm@11.14.1

WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared/package.json ./packages/shared/

# Install exact dependencies
RUN npm install

# Copy all source files
COPY . .

# Build the application using turbo or standard script
RUN npm --workspace apps/web run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Next.js standalone output automatically copies node_modules and shared dependencies!
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

# The standalone server requires the specific app path in monorepos
CMD ["node", "apps/web/server.js"]
