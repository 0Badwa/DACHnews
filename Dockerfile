# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Final stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .