# MADAR V10 — Netlify deployment fix

This build removes the incompatible pnpm patch for `wouter@3.7.1` that caused:
`ERR_PNPM_PATCH_NOT_APPLIED`.

Netlify settings are included in `netlify.toml`.

Build command: `pnpm build`
Publish directory: `dist/public`
Functions directory: `netlify/functions`
Node: `22`
PNPM: `10.4.1` via packageManager.

Required runtime environment variables depend on the features you enable. See `.env.example` and `DEPLOYMENT.md`.
