# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY rms-frontend/package*.json ./
RUN npm ci
COPY rms-frontend/ .
RUN npm run build

# Stage 2: Caddy with compiled frontend baked in
FROM caddy:2-alpine
COPY --from=frontend-builder /app/dist /srv/frontend
