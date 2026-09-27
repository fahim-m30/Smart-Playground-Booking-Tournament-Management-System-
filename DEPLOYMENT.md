# Deploy TURF: Render API + Vercel client

This repository no longer depends on a `localhost` API proxy. The React app reads `VITE_API_URL` at build time and calls the deployed Render API.

## 1. Deploy the API on Render

1. Push this repository to GitHub.
2. In Render, select **New > Blueprint**, then select the repository. Render reads the root [render.yaml](render.yaml).
3. Provide the values marked `sync: false`, especially `DATABASE_URL`, `CLIENT_URL`, and the Brevo credentials. Use a production MongoDB Atlas connection string for `DATABASE_URL`.
4. Deploy. Copy the API URL, for example `https://turf-api.onrender.com`.

The health check is `GET /`, and the API routes are under `/api/v1`.

## 2. Deploy the client on Vercel

1. Import the same repository in Vercel.
2. Set **Root Directory** to `client`. Vercel automatically detects the Vite build.
3. Add the production environment variable:

   ```text
   VITE_API_URL=https://turf-api.onrender.com/api/v1
   ```

4. Deploy. The included [client/vercel.json](client/vercel.json) keeps SPA routes working.

## 3. Connect both deployments

Copy the final Vercel production URL into Render's `CLIENT_URL` value, for example:

```text
https://turf.vercel.app
```

Redeploy Render after saving it. If you add a custom domain, include it in `CLIENT_URL`; multiple allowed origins can be comma-separated.

## Security

- Keep `.env` private. The example files list variable names only.
- Use separate random values for `JWT_ACCESS_SECRET` and `QR_SIGNING_SECRET`.
- Keep `SSL_IS_LIVE=false` until live SSLCommerz credentials and callback URLs are configured.
