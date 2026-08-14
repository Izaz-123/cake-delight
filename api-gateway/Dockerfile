FROM node:24-alpine

WORKDIR /app/api-gateway

# Build context is the project root so the gateway image can also carry the
# static frontend and the OpenAPI document (Kubernetes has no bind mounts).
COPY api-gateway/package*.json ./

RUN npm ci --omit=dev

COPY api-gateway/ ./

COPY frontend/ /app/frontend/

COPY docs/ /app/docs/

EXPOSE 8080

CMD ["npm", "start"]
