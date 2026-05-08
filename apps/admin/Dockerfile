FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install exact dependencies
RUN npm install

# Copy all source files
COPY . .

# Build the application
RUN npm --workspace apps/admin run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Next.js standalone output automatically copies node_modules and shared dependencies!
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3001

# The standalone server requires the specific app path in monorepos
CMD ["node", "apps/admin/server.js"]
