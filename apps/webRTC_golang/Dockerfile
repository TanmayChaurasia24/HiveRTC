FROM golang:1.22-alpine AS build
WORKDIR /app
COPY apps/webRTC/go.mod apps/webRTC/go.sum ./
RUN go mod download
COPY apps/webRTC ./
RUN go build -o webrtc-server .

FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/webrtc-server .
EXPOSE 8080
CMD ["./webrtc-server"]
