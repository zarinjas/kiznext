# Plan — OpenRouter free models + chatbot JSON fix

## Problem

User switched KIZ-AI chat provider to OpenRouter (`google/gemma-4-31b-it:free`),
but even "hello" fails with *"Sorry, I couldn't reach my brain just now."*

Root cause candidates:

1. The concierge always calls `generateJson`, which sends
   `response_format: { type: "json_object" }` (`lib/ai/provider.ts:169`). Some
   free OpenRouter models reject that → HTTP 400 → every JSON call fails.
2. Invalid model slug (404) or bad key (401).

The generic error hides the real reason (surfaced at
`components/shared/concierge/kiz-ai.tsx:213`, `error` from `askConciergeCore`).
Also note `gemma-4-31b` is **text-only** — even once chat works, KIZ Lens
(AR translate) still needs a **vision** model (e.g. `qwen/qwen2.5-vl-72b-instruct:free`).

User wants: (a) fix the chat failure, (b) list all free models from their
OpenRouter API in the admin panel so they can pick without trial-and-error.

## Changes

### 1. JSON fallback — `lib/ai/provider.ts` (`callOpenAiCompatible`)

Make JSON mode resilient: try with `response_format: { type: "json_object" }`;
if the provider returns 400 mentioning `response_format`/`json`, retry without
it (the prompts already say "JSON only" and `generateJson` strips fences).

```ts
const wantJson = Boolean(opts.json)
const buildBody = (withResponseFormat: boolean): Record<string, unknown> => ({
  model: target.model,
  messages,
  temperature: opts.temperature ?? 0.4,
  max_tokens: opts.maxOutputTokens ?? 1024,
  stream: false,
  ...(wantJson && withResponseFormat ? { response_format: { type: "json_object" } } : {}),
})

const headers: Record<string, string> = { ...(target.extraHeaders ?? {}) }
if (target.apiKey) headers.Authorization = `Bearer ${target.apiKey}`

let data: OpenAiChatResponse
try {
  data = await postJson<OpenAiChatResponse>(url, buildBody(true), target.label, headers)
} catch (err) {
  if (wantJson && err instanceof AiError && err.status === 400 && /response_format|json/i.test(err.message)) {
    data = await postJson<OpenAiChatResponse>(url, buildBody(false), target.label, headers)
  } else {
    throw err
  }
}

const text = data.choices?.[0]?.message?.content ?? ""
if (!text.trim()) throw new AiError(`${target.label} returned an empty response`)
return text.trim()
```

### 2. Types — `lib/ai/types.ts`

Extend `AiTestResult` with `json` + `vision` checks and add a model shape:

```ts
export interface AiTestResult {
  chat: { ok: boolean; detail: string }
  json: { ok: boolean; detail: string }
  vision: { ok: boolean; detail: string }
  embed: { ok: boolean; detail: string }
}

export interface OpenrouterModel {
  id: string
  name: string
  context: number
  vision: boolean
  structured: boolean
}
```

### 3. `lib/ai/admin-actions.ts`

**(a) Extend `testAiConnection`** to also run a JSON-mode call and a vision call:

- `json`: `generateJson<{ word: string }>(cfg, { prompt: 'Reply with JSON only: { "word": "OK" }', temperature: 0, maxOutputTokens: 256 })`.
- `vision`: rasterize a tiny SVG containing the text "OK" with `sharp` (already a
  dep), base64 it, then
  `generateText(cfg, { prompt: "Read the text in this image and reply with only that word.", image: { mimeType: "image/png", data }, temperature: 0, maxOutputTokens: 64 })`.
  A text-only model will fail here with a clear message → useful signal.

**(b) Add `listOpenrouterModels`** (returns `{ success, models?, error? }`):

- `GET {cfg.openrouterBaseUrl}/models` (public endpoint; add `Authorization` when
  a key is set).
- Filter `pricing.prompt === "0" && pricing.completion === "0"` (free).
- Map to `{ id, name, context: context_length, vision: architecture.input_modalities?.includes("image"), structured: supported_parameters?.includes("structured_outputs") }`.
- Sort: vision-capable first, then by name.

### 4. `app/(dashboard)/[role]/urus-ai/ai-settings-form.tsx`

- Render the new test results (json + vision) in the test `<Alert>` block.
- Add a **"Load free models"** button (loading/error state) that calls
  `listOpenrouterModels()` and fills a `<TextField select>` of free models
  (label shows `name` + `· vision` / `· structured` markers; value = model id).
  Selecting writes into the existing `openrouterModel` state.
- Show a warning when the selected model is not vision-capable ("KIZ Lens needs
  a vision model").

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- Manual: admin → `urus-ai` → pick a free **vision** model → Save → Test
  connection (expect chat/json/vision all OK) → chatbot replies to "hello".

## Notes / out of scope

- No new npm deps (uses `fetch` + existing `sharp`).
- Embeddings remain Gemini/Ollama; the model browser is for the chat provider only.
