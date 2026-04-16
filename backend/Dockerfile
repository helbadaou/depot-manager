FROM golang:1.22-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 go build -o depot-manager .

FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/depot-manager /app/depot-manager

ENV PORT=8080
ENV DB_PATH=/data/pos.db

RUN mkdir -p /data

EXPOSE 8080
VOLUME ["/data"]

CMD ["/app/depot-manager"]
