# Week 13 — Internationalization (i18n)

**Branch**: `feature/week-13-i18n` → `main`  
**Target**: Mar 9, 2026  
**Status**: ✅ Complete  
**Released**: Mar 9, 2026

## Overview

Week 13 adds comprehensive multi-language support to NoteBurner. Users can now read the interface in English, Spanish, French, German, Chinese (Simplified), or Hindi. The implementation uses a lightweight custom i18n engine — no external library required — keeping the bundle lean while providing full locale-aware date/number formatting, persistent language preferences, and regional compliance awareness on the backend.

---

## Features Implemented

### 1. ✅ Translation Files — 6 Languages

**Files Created:**
- `frontend/src/locales/en.json` — English (master, 200+ keys)
- `frontend/src/locales/es.json` — Spanish
- `frontend/src/locales/fr.json` — French
- `frontend/src/locales/de.json` — German
- `frontend/src/locales/zh.json` — Chinese (Simplified)
- `frontend/src/locales/hi.json` — Hindi

**Translation Key Groups:**
| Namespace | Coverage |
|---|---|
| `nav.*` | All header navigation links |
| `home.hero.*` | Hero section headline, sub-text, CTAs |
| `home.stats.*` | Platform statistics labels |
| `create.*` | Create-message form labels, placeholders, buttons |
| `view.*` | View/decrypt message page text |
| `auth.login.*` | Login form |
| `auth.signup.*` | Sign-up form |
| `common.*` | Shared UI strings (Save, Cancel, Error, Loading…) |
| `compliance.*` | GDPR/CCPA notice strings |
| `languages.*` | Language picker labels |

---

### 2. ✅ Core i18n Utility

**File Created:** `frontend/src/utils/i18n.js`

**Functions:**

| Function | Description |
|---|---|
| `translate(locale, key, params)` | Resolve dot-notation key (e.g. `'nav.create'`) from locale JSON, with `{variable}` interpolation. Falls back to English, then to the raw key. |
| `detectLocale()` | Reads `localStorage` (`noteburner_locale`), then `navigator.languages`. Falls back to `'en'`. |
| `saveLocale(locale)` | Persists selected locale to `localStorage`. |
| `formatDate(date, locale, opts)` | `Intl.DateTimeFormat` wrapper. |
| `formatNumber(n, locale, opts)` | `Intl.NumberFormat` wrapper. |
| `getTextDirection(locale)` | Returns `'ltr'` or `'rtl'` (ready for Arabic/Hebrew future expansion). |
| `SUPPORTED_LOCALES` | `['en', 'es', 'fr', 'de', 'zh', 'hi']` |

**Design Decisions:**
- Zero external dependencies — pure JSON + native `Intl` API.
- Safe key resolution: nested dot-notation without throwing on missing keys.
- `{param}` interpolation supports named placeholders in translation strings.

---

### 3. ✅ I18n React Context

**File Created:** `frontend/src/contexts/I18nContext.jsx`

**Exports:**
- `I18nProvider` — wraps the entire app; detects locale on mount, updates `document.documentElement.lang` and `.dir` on change.
- `useI18n()` — returns `{ locale, setLocale, t(key, params), formatDate, formatNumber, dir, supportedLocales }`.

**Usage in components:**
```jsx
const { t, locale, setLocale } = useI18n();
<h1>{t('home.hero.headline')}</h1>
```

---

### 4. ✅ Language Switcher Component

**File Created:** `frontend/src/components/LanguageSwitcher.jsx`

**Features:**
- Globe icon button in the header (before the dark-mode toggle).
- Dropdown with flag emojis and native language names: 🇺🇸 English · 🇪🇸 Español · 🇫🇷 Français · 🇩🇪 Deutsch · 🇨🇳 中文 · 🇮🇳 हिन्दी
- Active locale highlighted in amber with a checkmark.
- Outside-click auto-close using `useRef` + `useEffect`.
- Full ARIA attributes (`aria-label`, `role="menu"`, `aria-checked`).
- Persists selection via `saveLocale()`.

---

### 5. ✅ Header Integration

**File Modified:** `frontend/src/components/Header.jsx`

**Changes:**
- Imported `useI18n` and `LanguageSwitcher`.
- All nav links translated via `t('nav.*')` keys.
- Added **Premium** link with amber `Star` icon → `/pricing`.
- `<LanguageSwitcher />` placed between nav and dark-mode toggle.

---

### 6. ✅ App Wrapper

**File Modified:** `frontend/src/App.jsx`

**Changes:**
- Wrapped `<AuthProvider>` with `<I18nProvider>`.
- Added routes:
  - `/pricing` → `PricingPage` (Week 14)
  - `/premium` → `PremiumPage` (Week 14)

---

### 7. ✅ Backend Locale Middleware

**File Created:** `backend/src/middleware/locale.js`

**Exports:**
- `detectLocale()` — Hono middleware; parses `Accept-Language` header, selects the best supported locale, attaches to Hono context (`c.set('locale', locale)`), sets `Content-Language` response header.
- `getLocale(c)` — Retrieve detected locale in any route handler.
- `getComplianceRequirements(locale)` — Returns `{ gdpr, ccpa, region }` flags based on locale.

**Supported locale mapping:**

| Accept-Language prefix | Detected locale |
|---|---|
| `en` | `en` |
| `es` | `es` |
| `fr` | `fr` |
| `de` | `de` |
| `zh` | `zh` |
| `hi` | `hi` |
| anything else | `en` (fallback) |

**File Modified:** `backend/src/index.js`
```js
import { detectLocale } from './middleware/locale.js';
app.use('/*', detectLocale());
```

---

## Database Changes

None. i18n is entirely frontend + middleware; no new tables required.

---

## API Changes

| Endpoint | Change |
|---|---|
| All `/api/*` endpoints | Now respond with `Content-Language: <locale>` header |
| `GET /` | `features` array now includes `'i18n'` |

---

## Testing

**File Created:** `e2e/week13.spec.js`

Test suites:
1. **Backend: Locale Detection Middleware** — Content-Language header, fallback to `en`, Spanish/Chinese detection.
2. **Backend: Regional Compliance** — `GET /api/compliance/requirements`, features array includes `'i18n'`.
3. **Frontend: Language Switcher UI** — Home page loads, switcher present in header, `/pricing` accessible, locale persists on reload.
4. **Frontend: All 6 Locales** — No JS errors across all languages.
5. **Frontend: Date/Number Formatting** — `Intl.DateTimeFormat` / `Intl.NumberFormat` availability and locale-correct output.
6. **i18n Translation Keys** — Dot-notation resolution test.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│                                                     │
│  navigator.languages  ◄──  localStorage             │
│         │                      ▲                    │
│         ▼                      │                    │
│   detectLocale()        saveLocale()                │
│         │                      │                    │
│         ▼                      │                    │
│   I18nContext ──────────► LanguageSwitcher          │
│         │                                           │
│         ▼                                           │
│   useI18n() ──► t('key') ──► translate(locale, key) │
│                                                     │
│   Intl.DateTimeFormat / Intl.NumberFormat           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Cloudflare Worker                  │
│                                                     │
│  Request ──► detectLocale() middleware              │
│                   │   Accept-Language: fr-FR        │
│                   ▼                                 │
│             c.set('locale', 'fr')                   │
│             Content-Language: fr  ──► Response      │
└─────────────────────────────────────────────────────┘
```

---

## Bundle Impact

- **+0** npm dependencies added
- **~12KB** total new source (6 × locale JSON + utils + context + component)
- Locale JSON files loaded eagerly at startup (tiny files, < 5KB each)

---

## Acceptance Criteria Checklist

| Criterion | Status |
|---|---|
| Multi-language support (ES, FR, DE, ZH, HI) | ✅ |
| Auto-detect browser language | ✅ |
| Language switcher in header | ✅ |
| Translate all UI strings | ✅ (nav, home, create, view, auth, common) |
| Locale-specific date/time formats | ✅ (`Intl.DateTimeFormat` per locale) |
| Locale-specific number formats | ✅ (`Intl.NumberFormat` per locale) |
| GDPR (EU) compliance awareness | ✅ (`getComplianceRequirements` in middleware) |
| CCPA (California) compliance awareness | ✅ |
| Language preference persists | ✅ (`localStorage`) |
| RTL direction ready | ✅ (`getTextDirection()` returns `rtl` for future Arabic/Hebrew) |
| E2E tests | ✅ (`e2e/week13.spec.js`) |
| Documentation | ✅ (this file) |
