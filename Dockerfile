FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS stage

WORKDIR /app

# Copy only package files first for better caching of npm install
COPY package*.json ./
RUN npm ci

# Copy svelte config and run prepare
COPY svelte.config.js ./
RUN npm run prepare

COPY . .
RUN npm run build

FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
WORKDIR /app

# Copy pre-installed node_modules from build stage instead of reinstalling
COPY --from=stage /app/node_modules ./node_modules
COPY --from=stage /app/package*.json ./
COPY --from=stage /app/svelte.config.js ./
COPY --from=stage /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]