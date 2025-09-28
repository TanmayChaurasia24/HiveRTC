FROM "golang:1.17-alpine" AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 go build -o /bin/app ./cmd

FROM alpine:lastest
WORKDIR /src

COPY --from=0 /bin/app /bin/app
ENTRYPOINT ["/bin/app"]
