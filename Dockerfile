FROM node:20-alpine AS base

# Set working directory
WORKDIR /app/server

# Copy package files & install dependencies
COPY --chown=node:node server/package*.json ./
RUN npm ci --only=production

# Copy source code with non-root ownership
COPY --chown=node:node server/ ./

# Expose application port
EXPOSE 3001

# Set production environment defaults
ENV PORT=3001 \
    NODE_ENV=production \
    DATA_DIR=/app/server/data

# Security: Run container as non-root user 'node'
USER node

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { if (r.statusCode !== 200) process.exit(1); })"

CMD ["node", "index.js"]
