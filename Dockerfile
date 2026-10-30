FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci \
    --registry=https://registry.npmmirror.com \
    --replace-registry-host=always \
    --no-audit \
    --no-fund

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
