# Vulnerability Remediation

## API

```bash
cd apps/api
npm install
npm run dev
```

## Worker (BullMQ + Valkey)

```bash
docker compose up -d valkey
cd apps/api
npm run worker:vuln
```

## Environment

```
DATABASE_URL=postgresql://nucleus:nucleus@localhost:5432/nucleus
REDIS_URL=redis://localhost:6379
PORT=3000
```

## Endpoints

- `GET /api/v1/vuln/dashboard`
- `GET/POST /api/v1/vuln/scanners`
- `POST /api/v1/vuln/scanners/:id/sync`
- `GET /api/v1/vuln/findings`
- `GET /api/v1/vuln/groups`
- `GET /api/v1/vuln/tickets`
- `GET/POST /api/v1/vuln/assignment-rules`
