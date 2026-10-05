ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_URL=
ARG VITE_USE_MOCK_API=false
ARG VITE_YANDEX_MAPS_API_KEY=
ARG VITE_WS_DEBUG=false

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_USE_MOCK_API
ARG VITE_YANDEX_MAPS_API_KEY
ARG VITE_WS_DEBUG
RUN npm run build

FROM nginx:1.27-alpine
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_USE_MOCK_API
ARG VITE_YANDEX_MAPS_API_KEY
ARG VITE_WS_DEBUG
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_USE_MOCK_API=$VITE_USE_MOCK_API \
    VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY \
    VITE_WS_DEBUG=$VITE_WS_DEBUG
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
