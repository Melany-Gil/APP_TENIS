FROM node:22-alpine AS frontend
WORKDIR /app/scores-app
COPY scores-app/package*.json ./
RUN npm ci
COPY scores-app/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-alpine AS backend
ENV NODE_ENV=production
WORKDIR /app/scores-api
COPY scores-api/package*.json ./
RUN npm ci --omit=dev
COPY scores-api/ ./
COPY --from=frontend /app/scores-app/dist /app/scores-app/dist
EXPOSE 8000
CMD ["node", "server.js"]
