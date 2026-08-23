FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source code and build production assets
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package config and vite config
COPY package*.json ./
COPY vite.config.js ./

# Copy installed node_modules and built static bundle from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Serve the production build with Vite preview
CMD ["npm", "run", "preview"]
