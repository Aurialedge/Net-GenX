# NetGenX React Tactical Cyber Portal Frontend
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build production assets
COPY . .
RUN npm run build

EXPOSE 5173

# Serve production build on port 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
