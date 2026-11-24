# Nucleus CMDB

ServiceNow-like configuration management database platform.

## Frontend (look & feel preview)

The web UI runs with **mock data** — no backend required yet.

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm (included with Node.js) or [pnpm](https://pnpm.io/)

### Run locally

```bash
cd apps/web
npm install
npm run dev
```

Or from the repo root:

```bash
npm install --prefix apps/web
npm run dev
```

**Corporate network / SSL issues:** If `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, retry with:

```powershell
$env:NODE_OPTIONS="--use-system-ca"
npm install
```

Open [http://localhost:5173](http://localhost:5173)

### Screens

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats, recent CIs, conflicts |
| `/classes` | CI class tree + field definition editor |
| `/configuration-items` | Searchable CI list with filters |
| `/configuration-items/:id` | CI detail, attributes, relationship graph |
| `/relationships` | All typed CI relationships |
| `/vulnerabilities` | Vulnerability remediation dashboard |
| `/vulnerabilities/findings` | Scanner findings list |
| `/vulnerabilities/groups` | CVE group browser |
| `/vulnerabilities/tickets` | Remediation ticket queue |
| `/vulnerabilities/scanners` | Scanner connection manager |
| `/vulnerabilities/rules` | Assignment rules builder |

### Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router, React Flow, Lucide icons
