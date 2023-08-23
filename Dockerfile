FROM node:18-bookworm-slim as build

# Compile TS
WORKDIR /app
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY prisma ./prisma
RUN npm ci
RUN npm run db:generate
RUN npm run build

FROM node:18-bookworm-slim as app

RUN mkdir -p /opt/service/ && chown -R node: /opt/service
WORKDIR /opt/service
USER node

COPY package.json package-lock.json ./
RUN npm ci --production
COPY --from=build /app/build ./
COPY --from=build /app/node_modules/prisma/prisma-client ./node_modules/prisma/prisma-client

EXPOSE 8080
CMD ["node", "server.js", "--enable-source-maps"]
