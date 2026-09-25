# Fridge — iOS app

A native SwiftUI rewrite of RefrigeratorRecipes for iPhone. It tracks what's in
your fridge, freezer and pantry, reminds you before things expire, shows which
recipes you can make right now, plans the week, builds the shopping list, and
has an AI chef (Claude) that can also scan groceries from a photo.

## Features

| Tab | What it does |
| --- | --- |
| **Fridge** | Inventory by fridge / freezer / pantry, with a "Use soon" section. Add items by hand, by **barcode** (VisionKit + Open Food Facts lookup), or by **photo** (Claude identifies the groceries and estimates shelf life). Swipe right on an item to mark it used up and put it on the shopping list. |
| **Recipes** | Your recipes, ranked by what you can make now ("Ready to cook", "Missing 1–2 items", "Needs shopping"). Recipes that use expiring food rank higher. Import any recipe text with AI, or load the 20 sample recipes. |
| **Plan** | Weekly meal plan. **Shop for this week** adds everything the week's recipes need, scaled by servings, minus what you already have. |
| **Shopping** | Checklist that you can share. **Put checked items away** moves purchased items into the Fridge. |
| **Chef** | Chat with Claude about what to cook. It sees your inventory (with expiry dates), your recipes and your plan. **Save as recipe** turns any suggestion into a full saved recipe. |

Expiry reminders are local notifications (default: 1 day before, at 9 AM; set this in Settings).

## Architecture

```
ios/
├── project.yml                  XcodeGen spec (the .xcodeproj is generated, not committed)
├── Packages/FridgeCore/         Pure-Swift logic + unit tests (no UI, no persistence)
│   ├── IngredientName.swift     name normalization & fuzzy matching ("2 Large Tomatoes, diced" == "tomato")
│   ├── Expiry.swift             expired / expiring soon / fresh, by calendar day
│   ├── RecipeMatcher.swift      "what can I make" coverage + ranking
│   └── ShoppingListBuilder.swift aggregate planned needs − stock − already listed
└── RefrigeratorRecipes/
    ├── Models/                  SwiftData models (CloudKit-compatible)
    ├── Services/                Claude API client, Keychain, notifications, barcode lookup, sample data
    ├── Features/                One folder per tab + Settings
    └── Resources/               Assets, SampleRecipes.json (converted from the old web demo data)
```

- **Data:** SwiftData on the device. When the app is signed with the iCloud entitlement
  and you're signed in to iCloud, it syncs through your private CloudKit database. No
  server, no accounts. If CloudKit isn't available, it falls back to local-only storage.
- **AI:** calls the Claude Messages API directly (`claude-opus-5` by default; you can change
  the model in Settings → Advanced). Your API key is stored in the device Keychain and never synced.
- **Minimum iOS:** 18.0, iPhone only.

## Running it

Requirements: a Mac with Xcode 16 or newer, and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
brew install xcodegen
cd ios
xcodegen generate
open RefrigeratorRecipes.xcodeproj
```

Pick an iPhone simulator and run. In the simulator, barcode scanning and the camera are
unavailable and iCloud sync is off unless you sign in to iCloud in the simulator. Everything
else works, including photo scanning from the photo library.

### Running on your phone and sharing through TestFlight

1. In `project.yml`, change `bundleIdPrefix`, `PRODUCT_BUNDLE_IDENTIFIER` and the iCloud container
   (`iCloud.com.davidh216.RefrigeratorRecipes`) if you want a different identifier. Set
   `DEVELOPMENT_TEAM` to your Team ID, then run `xcodegen generate` again.
2. In Xcode → Signing & Capabilities, let Xcode register the App ID and the iCloud container.
3. Run on your iPhone. Grant notification permission when asked.
4. To share with your household: **Product → Archive → Distribute App → TestFlight**, then add
   people as testers in App Store Connect. This needs a paid Apple Developer account.
5. Before relying on sync across devices, open the CloudKit Console and **deploy the schema to
   Production**. TestFlight builds use the production CloudKit environment.

### AI setup

Create an API key at <https://console.anthropic.com/settings/keys> and paste it into
**Settings** (the gear icon on the Fridge tab). Chat messages, your inventory list and
scanned photos are sent to Anthropic's API only when you use an AI feature.

## Tests

```bash
swift test --package-path ios/Packages/FridgeCore
```

CI (`.github/workflows/ios.yml`) runs these tests and an unsigned simulator build on every
push that touches `ios/`.

## Ideas for next steps

- Home-screen widget showing what's expiring
- Siri / App Intents ("add milk to the shopping list")
- Household sharing across different Apple IDs (CloudKit shared database)
- Nutrition info and a cooking mode with step timers
