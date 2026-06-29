FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY shared ./shared
COPY server ./server
RUN npm install -w server
RUN npm run build -w server

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/shared ./shared
RUN npm install -w server --omit=dev
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server/src/index.js"]
