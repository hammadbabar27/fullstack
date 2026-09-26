# ---- Base image ----
FROM node:18-alpine

# ---- Set working directory inside the container ----
WORKDIR /usr/src/app

# ---- Install dependencies first (better layer caching) ----
COPY package*.json ./
RUN npm install --production

# ---- Copy the rest of the app ----
COPY . .

# ---- App listens on this port ----
EXPOSE 5000

# ---- Healthcheck (used by docker-compose / orchestrators) ----
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# ---- Start the app ----
CMD ["node", "server.js"]
