# Deployment

How to get the backend online so a real APK works.

## Why an APK needs this at all

In development the mobile app finds the backend by reading the LAN IP from
Metro. A standalone build has no Metro, so it cannot discover anything — the
API URL has to be compiled into the build, and it has to be **HTTPS**:

- `android/app/src/debug/AndroidManifest.xml` sets `usesCleartextTraffic="true"`,
  but that is the **debug** manifest. Release builds have no such flag, and
  Android blocks plain `http://` without it.
- `src/lib/api.ts` now throws on a standalone build when `EXPO_PUBLIC_API_URL`
  is missing, instead of silently falling back to `localhost` — which on a
  phone means the phone itself.

---

## 1. Put the code in a Git repo

Render deploys from GitHub/GitLab. This project is not a repo yet:

```bash
cd c:/Users/User/Documents/announcement
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`backend/.gitignore` already excludes `.env`, `env/` and `uploads/`, so no
secrets or local images are pushed. **Check `git status` before the first push.**

## 2. Deploy with the Blueprint

`render.yaml` at the repo root describes all three pieces: the API, the admin
console, and Postgres. In Render: **New → Blueprint**, pick the repo.

It provisions:

| Service | What |
|---|---|
| `announcement-api` | FastAPI on a `starter` instance, disk at `/var/data` |
| `announcement-admin` | admin-web as a static site, with SPA rewrites |
| `announcement-db` | Managed Postgres |

Two values are not auto-filled, by design:

- **`CORS_ORIGINS`** on the API — set to the admin site's URL, e.g.
  `https://announcement-admin.onrender.com`. The mobile app needs no entry;
  CORS applies to browsers, not native apps.
- **`VITE_API_URL`** on the admin site — set to the API's full URL including
  `https://`, then trigger a rebuild. Vite inlines it at build time.

### Why the instance is not free

The blueprint requests `plan: starter` because **persistent disks require a
paid instance**. On a free instance the filesystem is ephemeral: every event
image uploaded is deleted on the next redeploy, and on the restart that follows
the service sleeping. Free Postgres instances also expire after a limited
period. Confirm current pricing and terms when you sign up — they change.

If you want to stay free, move uploads to object storage (Cloudflare R2, S3,
Supabase Storage) instead of a disk, and drop the `disk:` block.

### Migrations

`startCommand` runs `alembic upgrade head` before uvicorn starts. Keep it that
way — deploying new code against an old schema is what makes endpoints 500 with
`relation "..." does not exist` until someone migrates by hand.

## 3. Verify the deployment

```bash
API=https://announcement-api.onrender.com

curl $API/api/health                  # {"status":"ok"}
curl $API/api/settings                # public display settings
curl -I $API/uploads/<some-file>.png  # 200 + image/png
```

The upload check matters most: it is the exact path the mobile app builds image
URLs from, and a 404 there means every event card renders blank.

## 4. Create the first admin

`POST /api/auth/register` only ever creates `role=user`, so the first admin has
to be promoted directly. From the Render Postgres shell:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## 5. Build the APK

Set the real URL in `mobile-app/eas.json` — replace `REPLACE-ME` in **both**
the `preview` and `production` profiles:

```json
"env": { "EXPO_PUBLIC_API_URL": "https://announcement-api.onrender.com" }
```

Then:

```bash
cd mobile-app
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview     # installable APK
eas build --platform android --profile production  # AAB for Play Store
```

`preview` produces an APK you can sideload for testing. `production` produces
an app bundle, which is what the Play Store takes.

Because `EXPO_PUBLIC_*` values are inlined at build time, **changing the API
URL means rebuilding the app** — it cannot be reconfigured after install.

---

## Known limitations

- **Uploads are tied to one disk.** A Render disk attaches to a single instance,
  so the API cannot scale beyond one instance without moving images to object
  storage first.
- **Free-tier sleep.** If you downgrade to a free instance, the service sleeps
  when idle and the first request afterwards takes several seconds — the app
  will look like it is hanging on launch.
- **`requirements.txt` includes `pytest` and `httpx`**, so production installs
  the test dependencies too. Harmless, just slower builds; split them out if
  that bothers you.
