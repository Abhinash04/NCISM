# NCISM frontend — build the Vite SPA, serve it with nginx + reverse-proxy /api/v1.

# --- Stage 1: build ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

# VITE_* vars are inlined at build time. Same-origin proxy → relative default.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: serve ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
