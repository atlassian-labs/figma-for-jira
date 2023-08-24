FROM node:18-bookworm-slim as build

# Compile TS
WORKDIR /app
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
RUN npm ci
COPY prisma ./prisma
RUN npm run db:generate
COPY src ./src
RUN npm run build

FROM node:18-bookworm-slim as app

RUN mkdir -p /opt/service/ && chown -R node: /opt/service
WORKDIR /opt/service
USER node

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY entrypoint.sh .
COPY --from=build /app/build ./
COPY --from=build /app/node_modules/prisma/prisma-client ./node_modules/prisma/prisma-client

EXPOSE 8080
ENTRYPOINT ["/opt/service/entrypoint.sh"]
