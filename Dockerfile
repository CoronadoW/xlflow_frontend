# ===== ETAPA 1: BUILD =====
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build -- --configuration=production

# ===== ETAPA 2: RUNTIME =====
FROM nginx:alpine

COPY --from=build /app/dist/esflowix-front/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]