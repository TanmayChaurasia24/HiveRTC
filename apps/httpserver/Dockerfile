FROM BASE as build-httpserver

COPY apps/httpserver ./apps/httpserver

WORKDIR /app/apps/httpserver
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "dev"]