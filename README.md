# Depot Manager

Depot Manager is a two-service app:

- `backend`: Go + Gin + SQLite API with websocket updates for manager receipts
- `frontend`: Next.js dashboard for login, sales, inventory, batch facture creation, and manager monitoring

## Default Accounts

- `manager / 1234`
- `sales / 1234`

## Live Fly Deployment

The app is deployed on Fly with these URLs:


Fly app names:



## 🌍 Custom domain for the frontend

The frontend does not need code changes to use a custom domain. On Fly.io, the usual steps are:

1. Add the domain to the Fly app:
	- `fly certs add yourdomain.com -a depot-manager-fe-helbadao`
2. Point your DNS to Fly:
	- For `www.yourdomain.com`, create a `CNAME` to `depot-manager-fe-helbadao.fly.dev`
	- For the root domain `yourdomain.com`, use these Fly ingress IPs:
	  - `A` record: `66.241.125.164`
	  - `AAAA` record: `2a09:8280:1::103:a3a9:0`
3. Wait for TLS to provision, then visit your domain.

If you also change the backend domain, update the frontend build variables in [frontend/fly.toml](frontend/fly.toml) so `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_WS_BASE` point to the new backend URL.

Start both services:

```bash
docker compose up --build
```

If your Docker installation uses the legacy binary:

```bash
docker-compose up --build
```

App URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`

Stop the stack:

```bash
docker compose down
```

Legacy form:

```bash
docker-compose down
```

Remove the database volume too:

```bash
docker compose down -v
```

Legacy form:

```bash
docker-compose down -v
```

## Docker Files

- [backend/Dockerfile](/home/helbadao/Desktop/depot-manager/backend/Dockerfile)
- [frontend/Dockerfile](/home/helbadao/Desktop/depot-manager/frontend/Dockerfile)
- [docker-compose.yml](/home/helbadao/Desktop/depot-manager/docker-compose.yml)

Notes:

- The backend image reads `PORT` and `DB_PATH`
- The frontend image uses `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_WS_BASE` at build time
- Because `NEXT_PUBLIC_*` values are compiled into the browser bundle, Fly deployment must set them in `[build.args]`, not only in runtime `[env]`

## Fly Config

- [backend/fly.toml](/home/helbadao/Desktop/depot-manager/backend/fly.toml)
- [frontend/fly.toml](/home/helbadao/Desktop/depot-manager/frontend/fly.toml)

### Backend Volume

The backend stores SQLite at `/data/pos.db` on a Fly volume named `depot_data`.

Create it manually if you redeploy from scratch:

```bash
fly volumes create depot_data --app depot-manager-be-helbadao --region cdg --size 1 --yes
```

### Deploy Commands

Backend:

```bash
cd backend
fly deploy --config fly.toml --remote-only
```

Frontend:

```bash
cd frontend
fly deploy --config fly.toml --remote-only
```

## Environment Variables

### Backend

- `PORT`: HTTP port, default `8080`
- `DB_PATH`: SQLite file path, default `./pos.db`

### Frontend Build Args

- `NEXT_PUBLIC_API_BASE`: browser API base URL
- `NEXT_PUBLIC_WS_BASE`: browser websocket base URL

## Verification

Local checks:

```bash
cd frontend && npm run build
cd ../backend && go test ./... && go build ./...
docker-compose config
```

Deployment smoke checks:

- `GET https://depot-manager-fe-helbadao.fly.dev` returns `200`
- `GET https://depot-manager-be-helbadao.fly.dev/products` responds successfully
- `POST https://depot-manager-be-helbadao.fly.dev/login` works with `manager / 1234`

## Tech Stack

- Backend: Go, Gin, SQLite
- Frontend: Next.js
- Realtime: WebSockets
- Deployment: Docker, Fly.io
