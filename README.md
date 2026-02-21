# SweatItOut 🔥 — Developer README

> AI-powered fitness + Indian diet tracker. Single-file PWA. No backend, no database, no API keys.

---

## Project Overview

SweatItOut is a **single HTML file** (`index.html`) that runs entirely in the browser. It uses AI to generate personalised workout and diet plans, tracks daily food intake with macro breakdowns, and lets users modify any plan via natural language chat.

**Stack:**
- Vanilla JS (ES2017 async/await, no framework, no build step)
- CSS custom properties for theming
- `localStorage` for all persistence
- Pollinations.AI for free AI inference (no key required)
- SheetJS (`xlsx.js`) for Excel exports
- PWA-capable with `manifest.json` + `sw.js`

---

## File Structure

```
sweatitout/
├── index.html      ← Entire app (HTML + CSS + JS, ~1400 lines)
├── manifest.json   ← PWA manifest (icons, theme, name)
├── sw.js           ← Service worker (offline caching)
└── README.md       ← This file
```

Everything — styles, logic, HTML structure — lives in `index.html`. There are no imports, no npm, no bundler. Open it in a browser and it works.

---

## Architecture: How the App is Structured

### 1. Global State Object (`S`)

All runtime state lives in a single object `S`:

```js
var S = {
  profile: null,        // User profile (set during onboarding)
  plan: null,           // AI-generated workout plan (JSON)
  diet: null,           // AI-generated 7-day diet plan (JSON)
  goal: 2000,           // Calorie goal (calculated from TDEE)
  activeDay: 0,         // Currently selected workout day index
  activeDietDay: 0,     // Currently selected diet day index
  log: {                // Today's food log (resets are manual — no auto daily reset yet)
    breakfast: [],
    lunch: [],
    snacks: [],
    dinner: []
  },
  aiHistory: {          // Per-section AI conversation history arrays
    workout: [],
    diet: [],
    food: []
  },
  meal: 'breakfast',    // Which meal the food modal will add to
  food: null            // Currently selected food item (in modal)
};
```

`S` is serialised to `localStorage` on every change via `save()`, and rehydrated on page load via the boot IIFE.

### 2. Boot Sequence

```
Page loads
  └─ IIFE checks localStorage for 'sweatitout'
       ├─ Found → parse JSON into S, skip onboarding, call initApp()
       └─ Not found → show onboarding slides
```

### 3. Tab Structure

Four tabs, each a `<div class="panel" id="panel-{name}">`:

| Tab | Panel ID | Content |
|-----|----------|---------|
| 🏠 Home | `panel-home` | Greeting, BMI card, calorie ring, workout preview |
| 💪 Workout | `panel-workout` | Day tabs, exercise cards with YouTube videos, AI panel |
| 🍱 Diet Plan | `panel-diet` | Day tabs, meal accordions, AI panel |
| 🔍 Food Log | `panel-food` | Calorie budget, macro bars, food search, meal sections, AI panel |

`switchTab(name)` adds/removes the `active` class on both the panel and the bottom tab button.

---

## AI Integration

### Provider: Pollinations.AI

**Why:** Completely free, no API key, no signup, no login. Works cross-origin from any browser. Uses GPT-4o-class models (`openai-large`).

**Endpoint:** `https://text.pollinations.ai/openai`

**Docs:** https://pollinations.ai

### `aiChat(prompt)` — Single-turn AI call

```js
async function aiChat(prompt) {
  // prompt can be a string OR an array of {role, content} messages
  var res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: 'openai-large',   // GPT-4o class
      messages: messages,
      seed: 42,                // Deterministic output
      private: true            // Don't log to Pollinations feed
    })
  });
  return data.choices[0].message.content;
}
```

Used for: plan generation, food nutrition lookup.

### `aiStream(messages, onChunk)` — Streaming AI call

Same endpoint with `stream: true`. Parses SSE (Server-Sent Events) line by line:

```
data: {"choices":[{"delta":{"content":"hello"}}]}
```

Falls back to `aiChat()` + simulated word-by-word typewriter if streaming fails.

Used for: inline AI chat panels (workout, diet, food).

---

## Plan Generation

### `generatePlan()` — Workout Plan

**Prompt pattern:** Asks AI to return pure JSON with this exact shape:

```json
{
  "planTitle": "...",
  "planDescription": "...",
  "days": [
    {
      "day": "Day 1",
      "focus": "Chest & Triceps",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": "3",
          "reps": "12",
          "rest": "60 sec",
          "tips": "Keep shoulder blades retracted...",
          "gifSearch": "bench press"
        }
      ]
    }
  ]
}
```

`gifSearch` is a 2-3 word phrase used by `loadYouTube()` to find matching video content.

### `generateDiet()` — Diet Plan

**Prompt pattern:** Asks AI to return 7 days of Indian meals:

```json
{
  "dietTitle": "...",
  "dietDescription": "...",
  "days": [
    {
      "day": "Day 1",
      "totalCal": 2000,
      "meals": [
        {
          "meal": "Breakfast",
          "items": [
            {
              "name": "Poha",
              "qty": "1 bowl (200g)",
              "cal": 220,
              "protein": 5,
              "carbs": 40,
              "fat": 4,
              "notes": "light and easy"
            }
          ]
        }
      ]
    }
  ]
}
```

Expected meals per day: `Breakfast`, `Mid-Morning Snack`, `Lunch`, `Evening Snack`, `Dinner`.

### `extractJSON(text)` — Robust JSON Parser

Because AI sometimes wraps JSON in markdown fences or adds preamble text, extraction uses:

1. Strip markdown code fences (` ```json ` ... ` ``` `)
2. Try `JSON.parse()` on the whole string
3. If that fails: scan character-by-character tracking brace depth to find the first complete `{...}` object
4. Return `null` if all attempts fail

---

## Inline AI Chat Panels

Each section (workout, diet, food log) has a collapsible AI panel at the bottom with quick-action chips and a free-text input.

### Flow: `aiSend(section, prefill?)`

```
User types message or taps chip
  └─ aiSend('workout', 'Make it more intense')
       ├─ Opens panel if collapsed
       ├─ Adds user message to S.aiHistory[section]
       ├─ Calls buildContext(section) → system prompt string
       ├─ Injects context into first message of history
       ├─ Calls aiStream() → streams response into chat bubble
       └─ On complete → applyAiResult(section, el, fullResponse)
```

### `buildContext(section)` — System Prompt Builder

Constructs a detailed system prompt tailored to the section:

**Workout context includes:**
- Full current `S.plan` as JSON
- User profile (name, age, weight, height, goal, level)
- Strict instruction to always output `RESULT_JSON:` on a new line

**Diet context includes:**
- Full current `S.diet` as JSON
- User profile + calorie target
- Strict instruction to always output `RESULT_JSON:` with all 7 days

**Food context includes:**
- Today's food log summary
- Current macro totals vs goal
- No JSON output expected — conversational analysis only

### `applyAiResult(section, el, fullResponse)` — Apply AI Changes

After streaming completes, scans response for the `RESULT_JSON:` marker:

```
"I've made the plan more intense.\nRESULT_JSON:{"planTitle":...}"
                                   ↑ marker
```

Splits at the marker:
- Everything before → displayed as AI message
- Everything after → passed to `extractJSON()` → if valid, applied to `S.plan` or `S.diet`

On successful update:
1. `S.plan` or `S.diet` is replaced with parsed data
2. `save()` writes to localStorage
3. `renderWorkout()` or `renderDiet()` rebuilds the DOM
4. `flashSection()` pulses an orange→green glow on the updated content
5. `switchTab()` auto-navigates the user to see changes
6. Toast notification confirms update

**If JSON parse fails:** Error message displayed in chat. User can retry.

---

## Calorie & Macro Calculations

### TDEE (Total Daily Energy Expenditure)

Calculated during onboarding using Mifflin-St Jeor BMR formula:

```js
// Male:
BMR = 88.4 + (13.4 × weight_kg) + (4.8 × height_cm) − (5.7 × age)

// Female:
BMR = 447.6 + (9.2 × weight_kg) + (3.1 × height_cm) − (4.3 × age)

TDEE = BMR × 1.55  // moderate activity assumed

// Goal adjustments:
weight_loss:  TDEE -= 500
muscle_gain:  TDEE += 300
```

Result stored as `S.goal` (calorie target per day).

### BMI

```js
BMI = weight_kg / (height_m)²
```

Displayed with a sliding marker on a coloured gradient bar (blue → green → yellow → red).

### Macro Targets (for progress bars)

Dashboard macro progress bars use these daily targets:

```js
protein_target = (S.goal × 0.30) / 4   // 30% of calories from protein (4 kcal/g)
carb_target    = (S.goal × 0.50) / 4   // 50% from carbs
fat_target     = (S.goal × 0.20) / 9   // 20% from fat (9 kcal/g)
```

### Food Quantity Unit Conversion

When user logs food with a non-gram unit, grams are calculated before applying the per-100g macros:

```js
piece → grams = qty × (food.defaultQty || 100)
cup   → grams = qty × 240
tbsp  → grams = qty × 15
g     → grams = qty (direct)
```

---

## Food Search

Triggered from the Food Log tab. Two-stage search:

**Stage 1 (instant):** Keyword match against `HINTS` array of 12 common Indian foods. Tapping a hint replaces the search term and triggers Stage 2.

**Stage 2 (after 650ms debounce):** `aiChat()` call asking Pollinations.AI to return 5 food matches as a JSON array:

```json
[
  {
    "name": "Basmati Rice (cooked)",
    "cal": 130,
    "protein": 2.7,
    "carbs": 28.0,
    "fat": 0.3,
    "defaultQty": 150,
    "defaultUnit": "g"
  }
]
```

All macro values are **per 100g**. The quantity modal then scales them based on the user's chosen amount and unit.

---

## Exercise Videos

`loadYouTube(box, exerciseName, gifSearch)` is called lazily when an exercise card is expanded for the first time.

**Lookup strategy:**
1. Match `exerciseName.toLowerCase()` against a hardcoded map of ~25 common exercises → known YouTube video IDs
2. If matched: embed `youtube-nocookie.com/embed/{videoId}` as an iframe
3. If no match: show a styled button linking to `youtube.com/results?search_query=...`

**To add more exercises to the known map**, find the `knownIds` object in `loadYouTube()` and add:
```js
'exercise keyword': 'youTubeVideoId'
```

The key is matched with `.indexOf()` so partial matches work (e.g. `'tricep'` matches `'Tricep Dips'`).

---

## Loading Screen

**Visual:** CSS-animated dancer character (pure CSS, no external images). Head bounces, arms swing alternately, legs kick — driven by `@keyframes` animations. Floating music notes (🎵🎶♩) animate upward.

**Sound:** Web Audio API synthesiser. A looping 8-note melody (triangle wave oscillator) plus sine wave bass kicks plays at 220ms intervals. Uses `AudioContext`. Starts on the first user gesture (the "Generate My Plan" button click satisfies browser autoplay policy).

```js
showLoading(msg)  // Shows overlay + starts music
hideLoading()     // Hides overlay + stops music
```

> **Note:** Sound requires a prior user gesture. It will work when triggered by button clicks (Generate, Regenerate) but not on programmatic calls without prior interaction.

---

## PWA Setup

Three files needed for installability:

**`manifest.json`** — App metadata (name, icons, theme colour, display mode). Must be served over HTTP/HTTPS (not `file://`).

**`sw.js`** — Service worker for offline caching. Registered in `index.html`:
```js
if ('serviceWorker' in navigator)
  navigator.serviceWorker.register('sw.js').catch(function(){});
```

**Install button** (`#install-btn`) — Hidden by default. Shown when the browser fires `beforeinstallprompt`. On iOS (which doesn't fire this event), tapping it shows a toast: "iOS: Share > Add to Home Screen".

---

## Excel Export

Uses **SheetJS** (`xlsx.full.min.js` from CDN).

**`exportDietExcel()`** — Exports `S.diet` as a multi-sheet `.xlsx`:
- Sheet 1: Summary (name, goal, calorie target)
- Sheets 2–8: One per day with meal → item rows and subtotals

**`exportWeekExcel()`** — Exports today's `S.log` as a single-sheet food log with totals row.

---

## Validation

Onboarding blocks progression to Step 2 (`nextOb(3)`) until:

| Field | Rule |
|-------|------|
| Name | Non-empty |
| Age | 10–100 |
| Weight | 20–300 kg |
| Height | 100–250 cm |

`showFieldError(id, msg)` shakes the invalid field, turns its border red, focuses it, and shows a toast. The border clears automatically on the next keystroke.

---

## CSS Design System

**CSS custom properties (defined on `:root`):**

```css
--bg:      #0a0a0a   /* page background */
--bg2:     #111      /* topbar, tab bar, AI panels */
--bg3:     #1a1a1a   /* input backgrounds, diet meal cards */
--surface: #1e1e1e   /* cards, exercise cards */
--border:  #2a2a2a   /* all borders */
--accent:  #ff4500   /* primary orange-red (buttons, active states) */
--accent2: #ff6b35   /* lighter orange (hover states) */
--green:   #00e676   /* success, remaining calories */
--text:    #f0f0f0   /* primary text */
--muted:   #888      /* secondary text, labels */
--r:       16px      /* default border-radius */
```

**Fonts:**
- `Syne` — headings, numbers, bold UI elements
- `DM Sans` — body text, inputs

---

## Key Functions Reference

| Function | Description |
|----------|-------------|
| `save()` | Serialise `S` to localStorage |
| `initApp(skip?)` | Boot the main app UI. `skip=true` skips plan rendering (used on AI error) |
| `generateAll()` | Run `generatePlan()` then `generateDiet()` with loading overlay |
| `generatePlan()` | AI call → parse → store in `S.plan` |
| `generateDiet()` | AI call → parse → store in `S.diet` |
| `regenWorkout()` | Regenerate workout only |
| `regenDiet()` | Regenerate diet only |
| `renderWorkout()` | Rebuild workout tab DOM from `S.plan` |
| `renderDiet()` | Rebuild diet tab DOM from `S.diet` |
| `renderDietDay()` | Rebuild current diet day from `S.diet.days[S.activeDietDay]` |
| `renderBMI()` | Update BMI card and marker |
| `refreshFood()` | Rebuild food log tab from `S.log` |
| `refreshDash()` | Update home dashboard rings and macro bars |
| `setupSearch()` | Attach food search listeners (called once on init) |
| `aiChat(prompt)` | Single AI call via Pollinations.AI |
| `aiStream(msgs, cb)` | Streaming AI call, fires `cb(chunk)` per token |
| `aiSend(section, prefill?)` | Send message in inline AI panel |
| `buildContext(section)` | Build system prompt for AI panel |
| `applyAiResult(section, el, full)` | Parse `RESULT_JSON:` and update plan/diet |
| `extractJSON(text)` | Robustly extract first JSON object from AI response |
| `switchTab(name)` | Navigate to a tab |
| `toggleEx(key)` | Expand/collapse exercise card, lazy-load YouTube |
| `loadYouTube(box, name, search)` | Embed YouTube iframe or link |
| `flashSection(id)` | Orange→green pulse animation on updated section |
| `showLoading(msg)` | Show loading overlay + start music |
| `hideLoading()` | Hide loading overlay + stop music |
| `toast(msg, type?)` | Show bottom toast (`success` \| `error`) |
| `showFieldError(id, msg)` | Shake field red + show error toast |

---

## Known Limitations & Things to Fix

1. **Food log doesn't auto-reset daily** — `S.log` persists forever. Needs a date check on boot to clear previous day's log.

2. **AI conversation history grows unbounded** — `S.aiHistory` arrays are never trimmed. Long conversations will bloat localStorage. Add a max-length trim (e.g. keep last 10 messages).

3. **YouTube video map is hardcoded** — Only ~25 exercises have known video IDs. Exercises outside the map fall back to a YouTube search link. The map should be expanded or replaced with a dynamic lookup.

4. **No multi-day food tracking** — Only tracks today. Consider storing logs by date key (`S.logHistory['2025-01-20']`).

5. **Diet plan is 7 days, workout is N days — they don't align** — The workout plan is based on days-per-week, but the diet is always 7 calendar days. They're independent and not linked.

6. **Pollinations.AI has no guaranteed uptime SLA** — If Pollinations is down, all AI features fail. Consider a fallback to a second free provider.

7. **`seed: 42` makes outputs less varied** — Changing or randomising the seed will give more diverse AI responses on regeneration.

8. **No dark/light mode toggle** — App is dark-only.

9. **Service worker caches aggressively** — After updates to `index.html`, users may need to hard-refresh or clear cache. Bump the SW version string when deploying updates.

---

## Development Tips

**To test without a server:**
Open `index.html` directly in Chrome/Firefox. PWA install and service workers require HTTPS or localhost — use `npx serve .` for local PWA testing.

**To change the AI model:**
Find `'openai-large'` in `aiChat()` and `aiStream()`. Available Pollinations models include `openai`, `openai-large`, `mistral`, `llama`. Larger models follow JSON instructions more reliably.

**To adjust the calorie prompt structure:**
Edit the template strings inside `generateDiet()` and `generatePlan()`. The JSON schema in the prompt comment is what the AI must match exactly.

**To add a new quick-action chip:**
In the HTML, find the `<div class="ai-chips">` inside the relevant AI panel and add:
```html
<div class="chip" onclick="aiSend('workout', 'Your prompt here')">🏷️ Label</div>
```

**To reset all data during development:**
```js
localStorage.removeItem('sweatitout'); location.reload();
```
Or tap the ⚙️ icon in the top right → "Reset".

**To inspect the full state at any time:**
```js
JSON.parse(localStorage.getItem('sweatitout'))
```

---

## AI Prompt Protocol (Critical)

The inline AI panels rely on a strict text protocol between the app and the AI:

```
[AI response text shown to user]
RESULT_JSON:{"planTitle":"...","days":[...]}
```

The `RESULT_JSON:` marker must appear on its own line at the end of the response. Everything before it is displayed as the chat message. Everything after it is parsed as JSON and applied to the app state.

The system prompt in `buildContext()` enforces this by:
1. Providing the full current plan JSON as context
2. Saying "ALWAYS output the complete updated plan... starting with RESULT_JSON:"
3. Giving an exact format example

If the AI ignores this and returns only text, `applyAiResult()` detects no marker and shows an error in the chat. The user can retry.

---

*Last updated during active development session. App version: single-file PWA, ~1400 lines.*
