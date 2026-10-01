# NetGenX Blockchain Ledger & Ethereum Smart Contract Service
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

EXPOSE 9000

ENV PORT=9000

# Blockchain ledger health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:9000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
