# Deploy — API (`api.posulation.com`)
Repo: https://github.com/Amit7366/posolution-server

## VPS layout
- App: `/opt/posulation/server` (git clone of this repo)
- Container: `posulation-server` → `127.0.0.1:8000`
- Nginx: `api.posulation.com` → `:8000`

## GitHub secrets
| Secret | Example |
|--------|---------|
| `VPS_HOST` | `37.44.244.251` |
| `VPS_USERNAME` | `root` |
| `VPS_KEY` | private SSH key (full PEM) |

Same secret names as the client repo. CI runs `git pull` + `docker compose up -d --build` on the VPS.
