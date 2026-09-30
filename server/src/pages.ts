// HTML pages served by the Worker: the public privacy policy and the owner's usage page.

const STYLE = `
:root {
  --bg: #F7F2EC; --surface: #FFFDFA; --ink: #2B2127; --muted: #5C5057; --line: #E4DBD3;
  --plum: #7B3A6B; --plumSoft: #F1E3EC; --bar: #7B3A6B; --bar2: #C9A3BE;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #171315; --surface: #231D20; --ink: #F6EFF2; --muted: #C2B6BC; --line: #3A3136;
    --plum: #E3A6D2; --plumSoft: #3A2434; --bar: #E3A6D2; --bar2: #7A5A70; color-scheme: dark;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 17px/1.6 -apple-system, "SF Pro Text", system-ui, "Segoe UI", sans-serif; padding: 32px 16px 64px; }
main { max-width: 720px; margin: 0 auto; }
h1 { font-size: 2rem; line-height: 1.15; margin: 0 0 6px; letter-spacing: -0.01em; }
h2 { font-size: 1.2rem; margin: 32px 0 8px; }
p, li { max-width: 65ch; }
.muted { color: var(--muted); }
a { color: var(--plum); }
ul { padding-left: 1.2em; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; font-size: 15px; }
th, td { text-align: right; padding: 8px 6px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th:first-child, td:first-child { text-align: left; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.scroll { overflow-x: auto; }
`;

function escapeHTML(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function privacyPage(contact: string): string {
  const reach = contact
    ? `email <a href="mailto:${escapeHTML(contact)}">${escapeHTML(contact)}</a>`
    : "send feedback from TestFlight (take a screenshot, then tap Share Beta Feedback)";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fridge Privacy Policy</title><style>${STYLE}</style></head><body><main>
<h1>Fridge privacy policy</h1>
<p class="muted">Last updated 1 October 2026</p>

<p>Fridge is an iPhone app for keeping track of the food you have, planning meals and cooking. It has no accounts, no ads, no analytics and no tracking. This page explains what leaves your phone, and when.</p>

<h2>What stays with you</h2>
<ul>
  <li>Your fridge, recipes, meal plans, shopping list and household settings (including allergies, diets and nutrition goals) are stored on your iPhone.</li>
  <li>If you're signed in to iCloud, they sync through your own private iCloud database so they appear on your other devices. That data is held by Apple under your iCloud account; we can't see it.</li>
  <li>Expiry reminders are scheduled on your phone. An Anthropic API key you enter yourself is kept in your phone's Keychain and is never synced.</li>
</ul>

<h2>AI features</h2>
<p>The chef, grocery photo and receipt scanning, recipe import and nutrition estimates use Claude, an AI model made by Anthropic. Only when you use one of these features, the app sends what that feature needs:</p>
<ul>
  <li>your question and the chat so far;</li>
  <li>a list of what's in your kitchen with expiry dates, your saved recipe titles, and your household's allergies, diets and nutrition goals, so suggestions fit your family;</li>
  <li>the photos you take for scanning (grocery photos and receipts);</li>
  <li>for recipe import, the text of the page or post, and for a saved video, a transcript and a few still frames (the video itself isn't uploaded).</li>
</ul>
<p>Without your own API key, these requests go through Fridge's server, which passes them to Anthropic and returns the answer. The server does not store what you send or what comes back. It keeps only a random ID for your install and a count of today's requests, used for the daily limit and deleted after two days, plus daily totals (number of requests and amount of text processed) with no content and no ID attached. The server runs on Cloudflare. With your own key, requests go straight from your phone to Anthropic.</p>
<p>Anthropic processes these requests under its <a href="https://www.anthropic.com/legal/privacy">privacy policy</a> and commercial terms, which say it does not use them to train its models by default.</p>

<h2>Other services the app contacts</h2>
<ul>
  <li><strong>Barcode lookup:</strong> when you scan a barcode, its number is looked up on <a href="https://world.openfoodfacts.org">Open Food Facts</a>.</li>
  <li><strong>Recipe links:</strong> when you import a link, your phone opens that page (and, for YouTube and TikTok, their public preview service), just as a browser would.</li>
  <li><strong>Video transcripts:</strong> speech in a video you import is turned into text by Apple's speech recognition, on your phone when your iPhone supports it, otherwise by Apple.</li>
  <li><strong>Ask another AI:</strong> if you tap this, your question and kitchen list are copied and opened in ChatGPT or Claude. From there, that app's own privacy policy applies.</li>
</ul>

<h2>Children</h2>
<p>Fridge is meant for adults running a household. It isn't directed at children under 13.</p>

<h2>Your choices</h2>
<ul>
  <li>You can use Fridge without any AI features; nothing is sent until you use one.</li>
  <li>Deleting the app removes its data from your phone. To remove synced data, delete Fridge's data under Settings → your name → iCloud → Manage Storage.</li>
</ul>

<h2>Changes and contact</h2>
<p>If this policy changes, the date at the top changes too. Questions? ${reach}.</p>
</main></body></html>`;
}

/** The owner's usage page. The data comes from /admin/usage with the admin password. */
export function adminPage(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Fridge Usage</title><style>${STYLE}
form { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
input { flex: 1; min-width: 0; font: inherit; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
button { font: inherit; font-weight: 600; padding: 10px 16px; border-radius: 10px; border: 0; background: var(--plum); color: var(--bg); }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 20px 0; }
.tile b { display: block; font-size: 1.6rem; font-variant-numeric: tabular-nums; }
.tile span { font-size: 13px; color: var(--muted); }
.bar { display: inline-flex; height: 10px; width: 120px; border-radius: 5px; overflow: hidden; background: var(--plumSoft); vertical-align: middle; }
.bar i { display: block; height: 100%; }
.error { color: #B42D14; }
</style></head><body><main>
<h1>Fridge usage</h1>
<p class="muted">Requests through the shared server, by UTC day. Costs are estimates from list prices; your Anthropic console shows the real bill.</p>
<form id="login"><label for="key" hidden>Admin password</label>
<input id="key" type="password" autocomplete="current-password" placeholder="Admin password">
<button>Show usage</button></form>
<p id="status" class="muted"></p>
<div id="report" hidden>
  <div class="tiles" id="tiles"></div>
  <div class="card scroll"><table><thead><tr><th>Day</th><th>Phones</th><th>Requests</th><th>Opus / Haiku</th><th>Tokens in</th><th>Tokens out</th><th>Est. cost</th></tr></thead><tbody id="rows"></tbody></table></div>
  <p class="muted" style="margin-top:12px">Bar: dark is the main model, light is Haiku.</p>
</div>
<script>
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + n.toFixed(n < 1 ? 3 : 2);
const count = (n) => n.toLocaleString();
function load(key) {
  $("status").textContent = "Loading…"; $("status").className = "muted";
  fetch("/admin/usage?days=30", { headers: { authorization: "Bearer " + key } })
    .then((r) => r.ok ? r.json() : Promise.reject(r.status === 401 ? "Wrong password." : "Couldn't load usage (" + r.status + ")."))
    .then((data) => {
      try { sessionStorage.setItem("fridgeAdmin", key); } catch {}
      $("status").textContent = "Limits: " + data.limits.perPhone + " requests per phone per day, " + data.limits.overall + " overall.";
      const sum = (days) => data.days.slice(0, days).reduce((a, d) => ({ r: a.r + d.requests, c: a.c + d.cost }), { r: 0, c: 0 });
      const today = data.days[0], week = sum(7), month = sum(30);
      $("tiles").innerHTML = [
        ["Today", count(today.requests) + " req", money(today.cost) + " · " + today.phones + " phones"],
        ["Last 7 days", count(week.r) + " req", money(week.c)],
        ["Last 30 days", count(month.r) + " req", money(month.c)],
      ].map(([label, big, small]) => '<div class="card tile"><span>' + label + '</span><b>' + big + '</b><span>' + small + '</span></div>').join("");
      const maxReq = Math.max(1, ...data.days.map((d) => d.requests));
      $("rows").innerHTML = data.days.map((d) => {
        const main = d.requests - d.light;
        const w = (n) => (n / maxReq * 100).toFixed(1) + "%";
        return "<tr><td>" + d.day + "</td><td>" + d.phones + "</td><td>" + count(d.requests) + "</td>"
          + '<td><span class="bar" title="' + main + ' main, ' + d.light + ' Haiku"><i style="width:' + w(main) + ';background:var(--bar)"></i><i style="width:' + w(d.light) + ';background:var(--bar2)"></i></span> ' + main + " / " + d.light + "</td>"
          + "<td>" + count(d.input) + "</td><td>" + count(d.output) + "</td><td>" + money(d.cost) + "</td></tr>";
      }).join("");
      $("report").hidden = false;
    })
    .catch((message) => { $("status").textContent = String(message); $("status").className = "error"; $("report").hidden = true; });
}
$("login").addEventListener("submit", (e) => { e.preventDefault(); load($("key").value.trim()); });
try { const saved = sessionStorage.getItem("fridgeAdmin"); if (saved) load(saved); } catch {}
</script>
</main></body></html>`;
}
