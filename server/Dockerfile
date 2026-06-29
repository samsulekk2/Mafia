FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY shared ./shared
COPY server ./server
RUN npm install -w server --omit=dev
RUN npm run build -w server
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
