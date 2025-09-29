FROM BASE as build_websocket

COPY apps/websocket apps/websocket
WORKDIR /app/apps/websocket
RUN pnpm --filter websocket build

CMD ["pnpm", "dev"]