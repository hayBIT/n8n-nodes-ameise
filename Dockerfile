# n8n image with the Ameise node built in, for testing without an npm release.
#   docker build -t n8n-ameise .
#   docker build --build-arg N8N_VERSION=2.44.4 -t n8n-ameise .
ARG N8N_VERSION=2.44.4

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM n8nio/n8n:${N8N_VERSION}
# Outside of /home/node/.n8n, which is usually a volume and would hide the node
COPY --from=build --chown=node:node /app/dist /opt/n8n-custom/n8n-nodes-ameise
ENV N8N_CUSTOM_EXTENSIONS=/opt/n8n-custom
