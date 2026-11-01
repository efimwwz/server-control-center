FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# The host-agent socket is root:root with mode 0660; the app uses the root
# group while running as the unprivileged node UID.
USER node:root

CMD ["npm", "run", "start"]
