# Stage 1: Build Environment
FROM node:20-alpine AS builder

# Install dependencies needed for node-gyp and native modules if any
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy root monorepo config
COPY package.json package-lock.json ./

# Copy shared package and API app
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Install dependencies (workspaces automatically linked)
RUN npm install

# Build shared package (if needed)
RUN npm run build -w @pitchy/shared || true

# Build API (if there's a build step, else it just copies src)
WORKDIR /app/apps/api
# E.g., RUN npm run build (Assuming you'll compile TS eventually, right now it uses tsx watch)
# For production, we should use standard tsc, but we will leave this ready for that.

# Stage 2: Production Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built node_modules and source files from builder
COPY --from=builder /app /app

WORKDIR /app/apps/api

# Expose Cloud Run default port
EXPOSE 8080
ENV PORT=8080

# Start command
# NOTE: Using tsx for execution since the project currently doesn't pre-compile TS to JS
CMD ["npx", "tsx", "src/index.ts"]
