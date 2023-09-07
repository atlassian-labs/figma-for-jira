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

RUN apt-get update -y && apt-get install -y openssl

RUN mkdir -p /opt/service/ && chown -R node: /opt/service
WORKDIR /opt/service
USER node

COPY package.json package-lock.json ./
# Ignore scripts to skip installing Husky
RUN npm ci --omit=dev --ignore-scripts
# Copy the compiled JS from the build image
COPY --from=build /app/build ./
COPY prisma ./prisma
COPY entrypoint.sh .

EXPOSE 8080
ENTRYPOINT ["/opt/service/entrypoint.sh"]
