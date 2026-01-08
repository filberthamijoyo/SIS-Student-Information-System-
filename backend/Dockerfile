# Multi-stage Dockerfile for development and production

# Development stage
FROM node:20-alpine AS development

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for ts-node-dev)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source and build
COPY src ./src
COPY database ./database
RUN npm run build

# Remove dev dependencies and source files
RUN npm prune --production && \
    rm -rf src tsconfig.json

# Set environment
ENV NODE_ENV=production

EXPOSE 5000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/server.js"]
