# Deploy MediBridge AI on Render + Supabase

Recommended hackathon deployment:

- Frontend: Render Static Site
- Backend: Render Web Service
- Database: Supabase PostgreSQL
- Uploaded files: local Render disk only for short demo use; use Supabase Storage later for persistence

The repository is a monorepo. **Keep Render Root Directory blank (repository root) for both services** because this project shares `/prisma` and `tsconfig.base.json` across frontend/backend. Render does not expose files outside a configured Root Directory.

## A. Prepare Supabase first

Follow `SUPABASE_SETUP.md` and obtain the Supabase Session Pooler `DATABASE_URL`.

Do not use the local SQLite database on Render if you expect database persistence. The included production Prisma schema targets PostgreSQL.

## B. Push this project to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Initial MediBridge AI prototype"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## C. Deploy the backend Web Service

In Render:

1. New → **Web Service**.
2. Connect the GitHub repository.
3. Leave **Root Directory blank** so the service can access the shared root `/prisma` folder and `tsconfig.base.json`.
4. Runtime: Node.
5. Build command:

```text
npm install --include=dev --prefix backend && npm --prefix backend run prisma:generate:prod && npm --prefix backend run build
```

6. Start command (Free-plan compatible; syncs schema before starting):

```text
npm --prefix backend run db:push:prod && npm --prefix backend run seed:prod && npm --prefix backend run start:prod
```

7. Add environment variables:

```text
NODE_ENV=production
DATABASE_URL=<Supabase Session Pooler connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=7d
AI_PROVIDER=mock
MAX_FILE_SIZE_MB=8
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
```

8. Choose the **Free** compute plan for a hackathon demo (or a paid plan if desired).
9. Deploy.
10. Open the backend URL and append `/api/health`. It should return a JSON status response.

> **Why schema sync + seed are in Start Command:** Render pre-deploy commands are a paid web-service feature. The seed is idempotent and skips when the demo admin already exists, so this hackathon setup works on the Free plan without shell access. For a real production service, remove automatic demo seeding and move migrations to a controlled pre-deploy/CI step.

### Demo seed behavior

The provided Render Start Command runs `seed:prod` automatically. The seed checks for `admin@medibridge.ai` first and skips duplicates, so the demo accounts are created on the first successful deployment. Remove this seed step for a real production deployment.

## D. Deploy the frontend Static Site

1. New → **Static Site**.
2. Connect the same repository.
3. Leave **Root Directory blank** so the frontend can access the shared root `tsconfig.base.json`.
4. Build command:

```text
npm install --include=dev --prefix frontend && npm --prefix frontend run build
```

5. Publish directory:

```text
frontend/dist
```

6. Add build-time environment variable:

```text
VITE_API_URL=https://YOUR-BACKEND.onrender.com/api
```

7. Add a rewrite so React Router routes open correctly on refresh:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

8. Deploy.

## E. Update backend CORS

After the frontend URL is known, set backend:

```text
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
```

Redeploy the backend.

## F. Test the deployed demo

1. Login as `doctor@medibridge.ai` / `demo123`.
2. Open Ravi Kumar.
3. Verify overview, timeline, graph and summary.
4. Open Voice Consultation and run the Tamil example.
5. Upload a synthetic PDF or image.
6. Approve extracted information as Doctor.
7. Reopen the timeline and graph to confirm new nodes/events.

## Render Blueprint option

A `render.yaml` file is included. You can use Render Blueprint/IaC flow if preferred, then fill the `sync: false` variables in the dashboard.

## File upload limitation on Render

The current prototype writes uploads to `/uploads`. Render web-service filesystems are ephemeral; on the Free plan, uploaded files can disappear on restart, redeploy, or spin-down. Use Supabase Storage (or another object store) for persistent medical-document files and keep only the object key/path in `MedicalDocument`.

## Common deployment issues

### CORS error

Make sure backend `FRONTEND_URL` exactly matches the Render frontend origin, including `https://` and no path suffix.

### Prisma cannot connect

Copy the Supabase connection string from the Dashboard Connect panel. For a typical long-running Render Node service, use the Session Pooler on port 5432 if direct IPv6 connectivity is unsuitable.

### Frontend shows API network error

Confirm `VITE_API_URL` ends with `/api`, then rebuild the Static Site because Vite environment variables are embedded at build time.

### React Router page returns 404 after refresh

Add the Static Site rewrite `/*` → `/index.html`.
