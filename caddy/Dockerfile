# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY modules/frontend/package*.json ./
RUN npm ci
COPY modules/frontend/ .
RUN npm run build

# Stage 2: Final image
FROM caddy:2-alpine
COPY --from=frontend-builder /app/dist /srv/frontend
