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
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
