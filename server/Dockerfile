FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY docker ./docker
COPY src ./src
EXPOSE 4000
CMD ["sh", "-c", "node src/db/seed.js && node src/server.js"]

