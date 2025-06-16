FROM node:24.2.0-bookworm-slim@sha256:b30c143a092c7dced8e17ad67a8783c03234d4844ee84c39090c9780491aaf89 as build

# Compile TS
WORKDIR /app
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY admin ./admin
RUN npm ci
COPY prisma ./prisma
RUN npm run db:generate
COPY src ./src
RUN npm run build

FROM node:24.2.0-bookworm-slim@sha256:b30c143a092c7dced8e17ad67a8783c03234d4844ee84c39090c9780491aaf89 as app

RUN apt-get update -y && apt-get install -y openssl

RUN mkdir -p /opt/service/ && chown -R node: /opt/service
WORKDIR /opt/service
USER node

COPY package.json package-lock.json ./
# Ignore scripts to skip installing Husky
RUN npm ci --omit=dev --ignore-scripts
# Copy the compiled JS from the build image
COPY --from=build /app/build ./
COPY --from=build /app/admin/dist ./admin/dist
COPY prisma ./prisma
COPY static ./static
COPY entrypoint.sh .

EXPOSE 8080
ENTRYPOINT ["/opt/service/entrypoint.sh"]
