# NetGenX IPFS Storage & Security Gateway Microservice
FROM node:22-slim

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

EXPOSE 8000

ENV PORT=8000
ENV NODE_ENV=production

# Gateway health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
