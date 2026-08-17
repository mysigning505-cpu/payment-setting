# Netlify deployment

## Important
This project uses a Netlify Function at `/.netlify/functions/settings` and Netlify Blobs. A plain static drag-and-drop deploy may not deploy the Function. Use one of the methods below.

### Option A — Netlify CLI (recommended)
1. Install Node.js.
2. In the extracted project folder run `npm install`.
3. Run `npx netlify login`.
4. Run `npx netlify link` and select your existing site (`b2552.netlify.app` / the site you want to update).
5. Run `npx netlify deploy --prod`.
6. Confirm the deploy includes `netlify/functions/settings.js`.

### Option B — GitHub
Push the extracted project to GitHub, then connect that repository to the existing Netlify site. Netlify will deploy the `netlify/functions` directory automatically.

### Test
Open `https://YOUR-SITE.netlify.app/.netlify/functions/settings`. A working deployment should return JSON settings rather than a 404 page. Then use Payment ×6 → enter `0107` → edit → Save → reload.
