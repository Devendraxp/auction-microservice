FROM oven/bun:1.0

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 3003

CMD ["bun", "start"]