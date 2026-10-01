# Public TestFlight beta: prep

Everything needed to open Fridge to testers outside the household. The copy below is ready to
paste into App Store Connect. The steps marked **(you)** need the account owner; nothing in this
repo can do them.

---

## 1. Tester-facing copy

Paste into **App Store Connect → TestFlight → Test Information** (and the external group's
"What to Test").

### Beta App Description (up to 4,000 characters)

> Fridge helps you cook what you already have before it goes bad.
>
> - Scan a grocery receipt or a photo of your groceries, and Fridge keeps track of what's in your
>   fridge, freezer and pantry, with a use-by guess for each item.
> - Tonight suggests three dinners from what you have, starting with food that's about to expire.
> - Browse 190+ starter recipes by mood ("Comfort food", "Feeling spicy", "Under the weather"…),
>   import recipes from a link or a cooking video, or ask the chef for ideas.
> - Plan the week around everyone's allergies, diets and nutrition goals, and the shopping list
>   fills itself.
>
> Your kitchen data stays on your iPhone and in your own iCloud. AI features (the chef, scanning
> and imports) send only what each feature needs to our server, which passes it to Claude
> (Anthropic) and keeps none of it. There's a daily allowance of AI requests per phone.

### What to Test

> Thanks for trying Fridge! Please:
>
> 1. Go through the welcome screens, add your household's allergies and diets, and scan your
>    last grocery receipt.
> 2. Use Tonight for a few evenings. Are the picks sensible? Does "Not tonight" help?
> 3. Try the mood chips on Recipes and Tonight, and ask the chef for something.
> 4. Import a recipe from a website, TikTok or Instagram link.
>
> Allergy and diet checks go by ingredient names only, so always read labels.
> Send feedback with a screenshot from TestFlight (take a screenshot, then tap Share Beta
> Feedback), or from the TestFlight app.

### Feedback email and privacy policy

- **Feedback email (you):** App Store Connect requires one for external testing. If you set the
  `FRIDGE_CONTACT_EMAIL` repository secret to the same address, the privacy page shows it too.
- **Privacy policy URL:** `<server URL>/privacy`. It's the Worker URL shown in the Server workflow's run
  summary (`https://….workers.dev/privacy`). It's already live.

---

## 2. Beta App Review notes

Paste into **Test Information → Beta App Review Information → Review Notes**.

> - No account or sign-in is needed. All features are available on first launch.
> - AI features (the chef, receipt and photo scanning, recipe import, nutrition estimates) use our
>   own server, which forwards requests to Anthropic's Claude API. No login is required; each install
>   has a small daily allowance. Requests are verified with Apple App Attest.
> - There are no purchases, subscriptions or paywalls.
> - To try it quickly: on the welcome screens, keep "Add starter recipes" on, then on the last
>   screen tap "Add items by hand" and add a few items (e.g. chicken, spinach, rice). Tonight
>   then suggests recipes.
> - Camera: barcode and grocery photo scanning. Photo library: choosing a grocery photo or a saved
>   cooking video to import. Speech recognition: transcribing a chosen cooking video on the device.
> - The "Under the weather" and "Easy to stomach" moods are meal ideas only and carry a
>   "not medical advice" note. The app makes no health claims.

Also fill in the contact name, phone and email there **(you)**.

---

## 3. App Store Connect steps (you)

1. **TestFlight → External Testing → +** to create a group, e.g. "Public beta".
2. Add the latest build from the `[testflight]` workflow to the group. The first build for an
   external group goes to **Beta App Review**, which usually takes a day. Later builds of the same
   version are often approved automatically.
3. Fill in **Test Information** (sections 1 and 2 above) and answer the export compliance question.
   The app already declares `ITSAppUsesNonExemptEncryption: false`.
4. Once approved, open the group's **Public Link**, turn it on, and set a **tester limit**: start
   with 25–50 so the AI allowance and server costs stay predictable.

---

## 4. Before opening the public link

| Check | Where | Status |
|---|---|---|
| Phase 1 (moods, cuisines, ids) and the welcome are in the build | this repo | Done; needs a device check |
| Pumpkin special (26 Oct) works on the build testers have | install the latest build before then | **Needed**: older builds show it without recipes |
| `FRIDGE_ADMIN_TOKEN` secret set, so `/admin` shows usage | GitHub → Settings → Secrets **(you)** | Check |
| App Attest verified share near 100% on `/admin` | usage page **(you)** | Then switch `ATTEST_MODE` to `require` in `server/wrangler.toml` |
| `GLOBAL_DAILY_LIMIT` raised for more testers | `server/wrangler.toml` (now 150/day overall, 15 per phone) | Decide; e.g. 50 testers × ~5 requests ≈ 250–400 |
| Anthropic spend limit set | console.anthropic.com **(you)** | Check |
| Feedback email and Beta App Review contact | App Store Connect **(you)** | Needed |

Changing `ATTEST_MODE` or the limits is a one-line change to `server/wrangler.toml`; pushing it
redeploys the server.
