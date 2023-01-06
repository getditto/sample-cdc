FROM node:16

WORKDIR /usr/src/cdc-bridge

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["node", "index.js"]
