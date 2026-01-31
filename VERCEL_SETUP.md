Hosting the Expo web build on Vercel

Quick overview
- This repo uses Expo (react-native + react-native-web). We'll build a static web bundle using `expo build:web` which outputs to `web-build/`.
- Vercel is configured to use `web-build` as the deployment output via `vercel.json`.

Steps to deploy (recommended)
1. Commit and push your branch to GitHub.
2. Go to https://vercel.com and sign in.
3. Create a new project and import your GitHub repository.
4. In the build settings use these values (Vercel auto-detect may work):
   - Framework preset: *Other* / *Static Site*
   - Build Command: `npm run build`
   - Output Directory: `web-build`
5. Add any environment variables your app needs in Vercel (e.g. `API_BASE_URL`, `CLOUDINARY_URL`).
6. Deploy — Vercel will run `npm ci` then `npm run build`.

Local test
- Build locally to verify output:

```bash
npm ci
npm run build
# The static site will be in web-build/
```

Notes and troubleshooting
- If `expo build:web` fails, ensure you have a compatible Node.js version and that `expo` is installed in dependencies (this repo includes `expo` already).
- For SPA routing on Vercel we rewrite all routes to `index.html` in `vercel.json`.
- If you prefer incremental builds, consider migrating to `expo export:web` or using a Next.js wrapper.

Want me to create a GitHub Action to automatically deploy to Vercel on push?

Automatic GitHub deployment (CI)

1. This repo includes a GitHub Actions workflow at `.github/workflows/vercel-deploy.yml` that runs on pushes to `main`. It will:
   - run `npm ci`
   - run `npm run build`
   - deploy the `web-build` output to Vercel using the Vercel Action

2. Required repository secrets (add them in GitHub > Settings > Secrets & variables > Actions):
   - `VERCEL_TOKEN` — a Vercel Personal Token (create at https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` — your Vercel Organization ID (found on your Vercel project settings)
   - `VERCEL_PROJECT_ID` — your Vercel Project ID (found on your Vercel project settings)

3. The workflow deploys to production using `--prod`. To change the branch or behavior edit `.github/workflows/vercel-deploy.yml`.

Once you add the three secrets and push to `main`, the Action will build and deploy automatically.

If you want, I can also add a GitHub Action that opens a PR with these changes, or set the workflow to run on a different branch — tell me which branch you want it to trigger on.