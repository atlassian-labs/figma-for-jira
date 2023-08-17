FROM node:lts-alpine as build

# Compile TS
WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY src ./src
RUN yarn build

FROM node:lts-alpine as app

RUN mkdir -p /opt/service/ && chown -R node: /opt/service
WORKDIR /opt/service
USER node

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --from=build /app/build ./

EXPOSE 8080
CMD ["node", "server.js"]
