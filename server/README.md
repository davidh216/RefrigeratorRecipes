# Fridge Claude server

A small Cloudflare Worker that lets testers use the AI features (chef, receipt and photo
scanning, recipe import, nutrition estimates) without an Anthropic API key of their own.
It holds your key, forwards the app's requests to Claude, and gives each install a daily
allowance.

- `POST /v1/messages`: the same body the app would send to Anthropic. The server runs it on
  `MODEL`, or on `LIGHT_MODEL` (Claude Haiku) when the app asks for that by name for photo,
  receipt and nutrition jobs. It caps output at 16k tokens, drops tools and other unexpected fields,
  and passes Anthropic's answer or error straight back.
- `GET /v1/quota`: `{ remaining, limit }` for this install today (shown in Settings).
- `GET /privacy`: the app's privacy policy (public; linked from Settings). Set the optional
  `FRIDGE_CONTACT_EMAIL` secret to show a contact address on it.
- `GET /admin`: your usage page: requests, phones, tokens and estimated cost per day, split
  between the main model and Haiku. Set the `FRIDGE_ADMIN_TOKEN` secret to a password to turn it
  on. The server keeps only daily totals for it, with no content and no install IDs.
- Every request needs `x-fridge-token` (built into TestFlight builds) and `x-fridge-install`
  (a random ID each install keeps in its Keychain).
- **App Attest.** The app also signs each request with a key from the iPhone's Secure Enclave
  that Apple has vouched for (`GET /v1/attest/challenge` then `POST /v1/attest` register it once;
  `x-fridge-key-id` and `x-fridge-assertion` sign each request over its exact body). That proves
  the request came from a genuine copy of Fridge, which the app token alone can't, since it ships
  inside the app. `src/appattest.ts` checks Apple's certificate chain against Apple's pinned root
  (re-checked against apple.com on every deploy), the key, the app ID and a replay counter.
  `ATTEST_MODE` in `wrangler.toml` sets what happens to unsigned requests: `report` (default)
  answers them and the usage page shows the share of verified requests; `require` refuses them.
  Switch to `require` once the usage page shows ~100% verified, i.e. everyone has updated.
- Limits, in `wrangler.toml`: `DAILY_LIMIT` requests per install per UTC day (15) and
  `GLOBAL_DAILY_LIMIT` for everyone together (150). Also set a monthly spend limit on the
  key in the Anthropic console; that is the hard stop.

People with their own key in Settings skip the server entirely.

## Super ingredient of the week

The app has 13 editions built in and rotates them every Monday. `content/super-ingredients.json`
adds to that without an app update; phones fetch it when they open and keep a copy for offline use.

- **Pin a special to a week:** add `"YYYY-MM-DD": "edition-id"` under `special`, using that week's
  Monday. (The sample pins `pumpkin` to Halloween week, Monday 26 October 2026.)
- **Add an edition:** add it under `editions`, in the same shape as the app's
  `ios/RefrigeratorRecipes/Resources/SuperIngredients.json`. Recipes the app's library doesn't have
  go in full under `recipeDetails`; run `python3 ios/tools/recipe_lint.py` on them first.
- **Replace a built-in edition:** give yours the same `id`.
- **Change the order:** set `rotation` to a list of edition ids.

Push the change and the Server workflow tests it (every recipe must exist, specials must be
Mondays, ids must be known) and deploys it. Phones pick it up the next time Fridge opens.

## One-time setup

1. **Cloudflare account** (the free plan is enough): <https://dash.cloudflare.com/sign-up>.
   New accounts get a `workers.dev` subdomain automatically; there's nothing to pick.
2. **Cloudflare API token**: My Profile → API Tokens → Create Token → template
   **Edit Cloudflare Workers** → Continue → Create. Copy the token. Your **Account ID** is on
   the right of the Workers & Pages overview page.
3. **Anthropic key for the server**: <https://console.anthropic.com/settings/keys>. A separate
   key from your personal one makes spend easy to see. Under Limits, set a monthly spend limit (for example $25): if something goes wrong, AI features stop instead of the bill growing.
4. **App token**: any long random string. The server and the app both have it. It keeps casual
   callers out, but it ships inside the app, so the daily limits are the real protection.
5. Add these **repository secrets** (GitHub → Settings → Secrets and variables → Actions →
   **Secrets** tab → **Repository secrets**; not Variables, and not Environment secrets):

   | Secret | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | step 2 |
   | `CLOUDFLARE_ACCOUNT_ID` | step 2 |
   | `ANTHROPIC_API_KEY` | step 3 (optional at first: without it the server answers "AI isn't switched on yet") |
   | `FRIDGE_APP_TOKEN` | step 4 |

6. Run **Actions → Server → Run workflow** (or push a change under `server/`). It tests,
   creates the quota store, deploys, and prints the server's URL in the run summary,
   e.g. `https://fridge-claude.<subdomain>.workers.dev`.
7. Add one more secret, `FRIDGE_PROXY_URL`, with that URL. The next TestFlight build
   includes the server, and testers get AI features with no setup.

## Running it

- **Switch AI on (or change the key)**: set the `ANTHROPIC_API_KEY` secret and re-run the Server
  workflow. After deploying, it makes one tiny Claude Haiku request through the server and fails
  if Claude doesn't answer.

- **Change limits or the model**: edit `wrangler.toml` and push.
- **Turn off one device**: in the Cloudflare dashboard, Workers KV → `fridge-quota`, add the
  key `block:<install id>` with any value.
- **Rotate the app token**: copy the current value into a new secret `FRIDGE_APP_TOKEN_OLD`,
  set `FRIDGE_APP_TOKEN` to a new value, and run the Server workflow; it then accepts both.
  Ship a TestFlight build (it embeds the new one), and delete `FRIDGE_APP_TOKEN_OLD` once
  testers have updated.
- **Local**: `npm install`, `npm test`, `npm run check`. `npx wrangler dev` with a `.dev.vars`
  file holding `ANTHROPIC_API_KEY=` and `APP_TOKEN=` runs it on your machine.
