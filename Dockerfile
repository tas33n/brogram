# Dockerfile
FROM node:20-slim

# Install fonts & deps Puppeteer may need
RUN apt-get update && apt-get install -y \
  ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libgtk-3-0 libnss3 libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# Default port for status server
EXPOSE 3000

# Puppeteer flags already included in code (--no-sandbox etc.)
CMD ["node", "src/index.js"]
