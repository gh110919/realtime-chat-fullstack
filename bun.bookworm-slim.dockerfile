FROM node:24-bookworm-slim

WORKDIR /home/WORKDIR

COPY . .

RUN npm i -g npm@latest
RUN npm i -g bun@latest
RUN npm i -g pm2@latest
RUN npm i -g nodemon@latest

RUN npm i --legacy-peer-deps

EXPOSE 3080 3180 4173 5173

CMD ["nodemon"]