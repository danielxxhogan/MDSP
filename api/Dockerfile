FROM node:14

MAINTAINER Your Name "hogand@sou.edu"

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE $PORT
CMD [ "node", "index.js" ]