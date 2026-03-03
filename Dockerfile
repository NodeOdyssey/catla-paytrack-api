FROM node:20-bookworm

WORKDIR /usr/src/app

RUN corepack enable

# copy manifests
COPY package.json pnpm-lock.yaml ./

# install ALL deps (needed for build + prisma)
RUN pnpm install --frozen-lockfile

COPY . .

# prisma needs CLI
RUN pnpm prisma generate

# build typescript
RUN pnpm build

# remove dev deps after build
RUN pnpm prune --prod

ENV NODE_ENV=production

EXPOSE 4020

CMD ["node", "dist/server.js"]
