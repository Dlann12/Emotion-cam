FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for node-gyp and sqlite/prisma
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build || true

EXPOSE 5000

CMD ["npm", "run", "dev"]
