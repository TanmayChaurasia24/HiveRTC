// using the base iamge
FROM BASE as build_frontend

COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend

RUN pnpm --filter frontend build

CMD ["pnpm", "dev"]