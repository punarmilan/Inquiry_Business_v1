FROM node:22-alpine AS build

WORKDIR /app/website/admin-frontend

COPY website/admin-frontend/package*.json ./
RUN npm ci

COPY website/admin-frontend/ ./
COPY mobile/frontend/src/ /app/mobile/frontend/src/
COPY mobile/frontend/assets/ /app/mobile/frontend/assets/

ARG VITE_API_BASE_URL=https://web-api.inquiry.business
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/website/admin-frontend/dist /usr/share/nginx/html
COPY website/admin-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
