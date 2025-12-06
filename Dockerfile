FROM node:alpine AS stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:alpine
WORKDIR /app
COPY --from=stage /app/package*.json ./
COPY --from=stage /app/build ./build

RUN npm install --production
EXPOSE 3000
CMD ["node", "build/index.js"]