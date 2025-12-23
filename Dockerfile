FROM node:alpine AS stage

WORKDIR /app

COPY package*.json svelte.config.js ./
RUN npm ci && npm run prepare

COPY . .
RUN npm run build

FROM node:alpine
WORKDIR /app
COPY --from=stage /app/package*.json ./ 
COPY --from=stage /app/svelte.config.js ./
RUN npm ci --omit=dev


COPY --from=stage /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]