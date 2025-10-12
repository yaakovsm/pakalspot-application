# --- build stage ---
    FROM oven/bun:1 AS build
    WORKDIR /app
    COPY package.json bun.lockb* ./
    RUN bun install --frozen-lockfile
    COPY . .
    ARG VITE_GOOGLE_MAPS_API_KEY
    ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
    RUN bun run build
    
    # --- run stage ---
    FROM nginx:1.27-alpine
    WORKDIR /usr/share/nginx/html
    COPY --from=build /app/dist ./
    RUN rm -f /etc/nginx/conf.d/default.conf
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    EXPOSE 80
    
    # Add healthcheck for K8s/Docker
    HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
        CMD wget -qO- http://localhost:80 || exit 1
    