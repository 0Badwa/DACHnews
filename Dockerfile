# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Instaliraj Alpine zavisnosti za native module
RUN apk add --no-cache gcompat python3 make g++

# Kopiraj package.json i instaliraj zavisnosti
COPY package*.json ./
RUN npm ci --omit=dev  # Zamenjuje --production

# Kopiraj ceo izvorni kod
COPY . .

# Final stage
FROM node:18-alpine
WORKDIR /app

# Kopiraj samo bitne fajlove iz build faze
COPY --from=builder /app .

# Pokreni aplikaciju
CMD ["node", "index.js"]