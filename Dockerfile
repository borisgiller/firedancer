FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html .
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY ./.npmrc ./

EXPOSE 3000
ENV NODE_ENV production
CMD ["npm", "start"]
