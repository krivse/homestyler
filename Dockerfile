FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app
COPY . /app
COPY .env /app
RUN npm i

CMD ["node", "homestyler/bot.js"]