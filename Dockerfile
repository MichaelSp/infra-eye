FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS stage

WORKDIR /app

# Copy only package files first for better caching of npm install
COPY package*.json ./
RUN npm ci

# Copy svelte config and run prepare
COPY svelte.config.js ./
RUN npm run prepare

COPY . .
RUN npm run build

FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf
WORKDIR /app

# Copy pre-installed node_modules from build stage instead of reinstalling
COPY --from=stage /app/node_modules ./node_modules
COPY --from=stage /app/package*.json ./
COPY --from=stage /app/svelte.config.js ./
COPY --from=stage /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]