FROM node:20-alpine3.20 AS stage

WORKDIR /app

COPY package*.json svelte.config.js ./
RUN npm ci && npm run prepare

COPY . .
RUN npm run build

FROM node:20-alpine3.20
WORKDIR /app

# Copy pre-installed node_modules from build stage instead of reinstalling
COPY --from=stage /app/node_modules ./node_modules
COPY --from=stage /app/package*.json ./
COPY --from=stage /app/svelte.config.js ./
COPY --from=stage /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]