FROM oven/bun:1.0 AS build

WORKDIR /app

# Define build arguments for environment variables
ARG VITE_AUCTION_SERVICE_URL
ARG VITE_BID_SERVICE_URL
ARG VITE_WEBSOCKET_SERVICE_URL

# Set environment variables from build args
ENV VITE_AUCTION_SERVICE_URL=${VITE_AUCTION_SERVICE_URL}
ENV VITE_BID_SERVICE_URL=${VITE_BID_SERVICE_URL}
ENV VITE_WEBSOCKET_SERVICE_URL=${VITE_WEBSOCKET_SERVICE_URL}

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy our custom Nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]