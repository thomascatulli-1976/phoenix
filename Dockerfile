FROM node:22-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build:office

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app
RUN addgroup -S phoenix && adduser -S -G phoenix phoenix

COPY --from=build /app/dist ./dist
COPY config ./config

USER phoenix
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/companions/office-companion/server.js"]
