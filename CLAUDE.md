# MagguuUI v3 — Projektdokumentation

## Projektübersicht

**Name:** MagguuUI v3.0.0
**Zweck:** WoW UI Configuration Manager — öffentliche Website + Admin Panel + REST API für Import Strings (ElvUI, Plater, BigWigs, Details etc.)
**Live-URL:** https://ui.magguu.xyz
**GitHub:** https://github.com/Derpsen/MagguuUI-Website
**Port:** 3000 (intern), öffentlich via Cloudflare Tunnel

---

## Tech-Stack

| Kategorie | Technologie |
|-----------|------------|
| Framework | Nuxt 4 (^4.0.0) + Vue 3 Composition API |
| Sprache | TypeScript |
| Datenbank | SQLite (better-sqlite3) mit WAL-Modus |
| ORM | Drizzle ORM (^0.45.0) |
| UI Library | NuxtUI v4 (^4.5.0) — basierend auf Reka UI |
| Styling | Tailwind CSS v4 (CSS-first, @theme Direktive) + Custom CSS (Public Brand Styles + Admin Design System) |
| Auth | JWT (jsonwebtoken) + bcrypt + WebAuthn/Passkeys (SimpleWebAuthn) + HttpOnly Cookie Support |
| Validierung | Zod v4 |
| Editor | TipTap (ProseMirror) |
| Markdown | Marked |
| Fonts | Plus Jakarta Sans, JetBrains Mono (via @theme in CSS) |
| Icons | Heroicons, Simple Icons (via @iconify-json) |
| Deployment | Docker (Node 24-bookworm) |

---

## Projektstruktur

```
├── pages/                      # File-based Routing
│   ├── index.vue               # Landing Page (public)
│   ├── strings.vue             # Import Strings Browser
│   ├── guide.vue               # Installationsanleitung
│   ├── changelog.vue           # Changelog
│   ├── faq.vue                 # FAQ
│   ├── about.vue               # Über MagguuUI
│   ├── imprint.vue             # Impressum (Legal)
│   ├── privacy.vue             # Datenschutz (Legal)
│   └── admin/                  # Admin Panel (SSR deaktiviert)
│       ├── index.vue           # Dashboard
│       ├── login.vue           # Login (Password + Passkey)
│       ├── content/            # Content Management
│       ├── strings/            # String-Verwaltung (profiles, wowup, layouts)
│       └── system/             # System (settings, stats, users, api-keys, github, fields, activity)
│
├── components/                 # Vue Components
│   ├── admin/                  # Wiederverwendbare Admin-UI-Primitives
│   │   ├── EmptyState.vue      # Leerer Zustand für Panels und Tabellen
│   │   ├── MetricCard.vue      # KPI- und Trend-Karten
│   │   ├── PageHeader.vue      # Standardisierter Seitenkopf mit Actions/Meta
│   │   ├── Panel.vue           # Card-/Panel-Container für Admin-Surfaces
│   │   └── StickyBar.vue       # Sticky Save/Publish Bar für Editor-Seiten
│   ├── CommandPalette.vue      # Cmd+K Navigation (nutzt shared admin navigation + UModal #content Slot)
│   ├── FaqItem.vue             # FAQ Accordion
│   ├── KeyboardShortcuts.vue   # Admin Keyboard Shortcuts Modal (? Taste)
│   └── TipTapEditor.vue        # Rich Text Editor
│
├── composables/                # Vue Composables
│   ├── useApi.ts               # Auth-API-Wrapper
│   ├── useAdminNavigation.ts   # Sections, Context, Active-State-Logik, Command Palette + Mobile Dock
│   ├── useAdminNotifications.ts # Notification Center für den Admin-Bereich
│   ├── useAuth.ts              # Auth State (JWT + Cookie-Session-Fallback)
│   ├── useIsDark.ts            # Dark Mode Helper
│   ├── usePageTracking.ts      # Public Analytics / Tracking Hooks
│   └── useScrollReveal.ts      # Scroll-Animationen
│
├── layouts/
│   ├── default.vue             # Public Layout (sticky Navbar, Footer, Public-Admin-Leiste, Mobile-Overlay-Menü) — <UApp> Wrapper
│   └── admin.vue               # Responsive Admin Shell (Sidebar, Toolbar, Notifications, Mobile Dock) — <UApp> Wrapper
│
├── server/
│   ├── api/v1/                 # REST API Endpoints
│   │   ├── auth/               # Login, WebAuthn (Passkey Registration/Login)
│   │   ├── profiles/           # Public: GET
│   │   ├── layouts/            # Public: GET
│   │   ├── wowup/              # Public: GET
│   │   ├── changelogs/         # Public: GET
│   │   ├── content/            # Public: GET
│   │   └── admin/              # Admin: CRUD (JWT-geschützt)
│   │       ├── profiles/       # GET, POST, PUT, PATCH, DELETE, bulk-delete, reorder
│   │       ├── wowup/          # GET, POST, PUT, DELETE, bulk-delete, reorder
│   │       ├── layouts/        # GET, POST, PUT, DELETE, bulk-delete, reorder
│   │       ├── changelogs/     # CRUD
│   │       ├── content/        # GET, PUT (bulk)
│   │       ├── settings/       # GET, PUT
│   │       ├── users/          # CRUD
│   │       ├── api-keys/       # CRUD
│   │       ├── stats/          # GET
│   │       ├── github/         # export, import, push, pull, test, status
│   │       ├── activity/       # GET, stats
│   │       └── ...
│   │
│   ├── database/
│   │   ├── schema.ts           # Drizzle Schema (inkl. Sessions, Rate Limits, Analytics)
│   │   ├── index.ts            # DB Connection (WAL-Modus)
│   │   ├── seed.ts             # Seed Script
│   │
│   ├── middleware/
│   │   └── admin-api.ts        # JWT-Validierung für /api/v1/admin/*
│   │
│   ├── plugins/
│   │   ├── init.ts             # DB Init & Setup
│   │   ├── security-headers.ts # Security / Hardening Headers
│   │   └── session-cleanup.ts  # Session / Challenge Cleanup
│   │
│   └── utils/
│       ├── auth.ts             # createToken, verifyToken, requireAuth, Cookie-Helfer
│       ├── response.ts         # apiSuccess, apiError
│       ├── validation.ts       # Zod Schemas
│       ├── rateLimit.ts        # Persistentes SQLite Rate Limiting (5/15min Login)
│       ├── activityLog.ts      # Activity Logging + Auto-Changelog
│       ├── github.ts           # GitHub API Integration
│       └── syncChangelog.ts    # Changelog Sync
│
├── middleware/
│   └── admin.global.ts         # Client-seitige Admin Route Protection
│
├── assets/css/main.css         # Tailwind v4 Imports + @theme + Custom Styles
├── public/
│   ├── logo.svg                # Logo
│   ├── og-image.svg            # Open Graph Vorschaubild
│   ├── robots.txt              # Crawler-Steuerung
│   ├── sitemap.xml             # Sitemap für SEO
│   └── manifest.json           # PWA Web App Manifest
├── data/magguuui.db            # SQLite Datenbank (Runtime)
├── uploads/                    # Uploads Verzeichnis
│
├── nuxt.config.ts              # Nuxt 4 Konfiguration
├── app.config.ts               # NuxtUI v4 Theme Config (Slots-System)
├── drizzle.config.ts           # Drizzle ORM Config
├── tsconfig.json               # TypeScript (extends .nuxt)
├── Dockerfile                  # Docker Build (Node 24)
├── .env.example                # Env-Vorlage
├── rebuild.sh                  # Docker Rebuild (Unraid)
└── README.md                   # Kurz-Doku / Setup-Hinweise
```

**Hinweis:** `tailwind.config.ts` existiert NICHT mehr — Tailwind v4 nutzt CSS-first Konfiguration via `@theme` in `assets/css/main.css`.

---

## Entwicklungs-Commands

```bash
npm run dev              # Dev Server starten
npm run build            # Production Build
npm run preview          # Production Build lokal testen

npm run db:generate      # Drizzle Migrationen generieren
npm run db:migrate       # Migrationen ausführen
npm run db:push          # Schema direkt pushen (Dev)
npm run db:studio        # Drizzle Studio (DB GUI)
npm run db:seed          # Seed-Daten einfügen
```

## Deployment (Unraid Docker)

**Aktueller Stand:** Deploy erfolgt per Git-Checkout auf Unraid, nicht mehr per ZIP-Update.

**Ingress:** Keine Zoraxy-Proxy-Kette mehr. Die öffentliche Erreichbarkeit läuft über einen Cloudflare Tunnel.

**Warum:** Gelöschte getrackte Dateien werden sauber entfernt, `rebuild.sh` aktualisiert sich automatisch mit dem Repo, und der Deploy-Ordner bleibt identisch zum Stand auf GitHub.

**Voraussetzungen auf Unraid:**
- `git` ist installiert/verfügbar
- Zugriff auf das private GitHub-Repo via Fine-Grained PAT oder SSH
- `/mnt/user/appdata/nuxt` ist eine reine Deploy-Kopie ohne lokale Code-Änderungen

**Einmalige Migration von ZIP/Manuell auf Git:**
```bash
cd /mnt/user/appdata
mv nuxt nuxt_backup_$(date +%F_%H-%M-%S)
git clone https://github.com/Derpsen/MagguuUI-Website.git /mnt/user/appdata/nuxt
cp /mnt/user/appdata/nuxt_backup_*/.env /mnt/user/appdata/nuxt/ 2>/dev/null || true
cp -a /mnt/user/appdata/nuxt_backup_*/data /mnt/user/appdata/nuxt/ 2>/dev/null || true
cp -a /mnt/user/appdata/nuxt_backup_*/uploads /mnt/user/appdata/nuxt/ 2>/dev/null || true
cd /mnt/user/appdata/nuxt
bash rebuild.sh
```

**Normales Update danach:**
```bash
cd /mnt/user/appdata/nuxt
git fetch origin main
git reset --hard origin/main
bash rebuild.sh
```

**Deploy-Einzeiler:**
```bash
cd /mnt/user/appdata/nuxt && git fetch origin main && git reset --hard origin/main && bash rebuild.sh
```

**Skip-Logik im Rebuild:**
- `rebuild.sh` baut nur noch dann neu, wenn sich der ausgecheckte Git-Commit vom aktuell lokal gebauten Docker-Image unterscheidet
- die Prüfung läuft über das OCI-Label `org.opencontainers.image.revision`
- wenn Container und Image schon auf dem aktuellen Commit sind, wird der Build komplett übersprungen
- `FORCE_REBUILD=1 bash rebuild.sh` erzwingt trotzdem einen frischen Build
- das Dockerfile schreibt zusätzlich Commit- und Build-Zeit als OCI-Metadaten ins Image

**Wichtig:**
- `.env`, `data/` und `uploads/` werden nur beim ersten Umstieg aus dem Backup zurückkopiert
- diese Laufzeitdaten liegen absichtlich **nicht** im Deploy-Repo
- `git reset --hard origin/main` ist nur safe, wenn im Unraid-Ordner keine lokalen Code-Änderungen liegen
- wenn nach einem frischen Clone Login/Daten fehlen, wurde meist `data/` noch nicht aus dem Backup zurückgespielt

---

## Architektur-Entscheidungen

- **SSR für Public Pages, CSR für Admin:** Admin-Bereich nutzt `ssr: false` (Route Rule in nuxt.config.ts) um Auth-Token-Flash zu vermeiden
- **SQLite mit WAL-Modus:** Einfache Deployment-Strategie für Single-Server, `busy_timeout = 5000`
- **JWT Auth (24h Expiry):** Token in localStorage, Server-Middleware validiert alle `/api/v1/admin/*` Requests
- **HttpOnly Cookie Support:** Backend setzt zusätzlich ein Same-Origin HttpOnly Session-Cookie, Bearer-Token bleibt für den bestehenden Admin-Client kompatibel
- **WebAuthn/Passkeys:** Biometrische Authentifizierung via SimpleWebAuthn (Registration + Login)
- **Rate Limiting:** Login auf 5 Versuche pro 15 Minuten pro IP begrenzt, persistent in SQLite statt nur im Prozessspeicher
- **Public API Caching:** Öffentliche Read-Endpunkte laufen über `routeRules` mit kurzem SWR-Cache
- **Monolithisch:** Ein Nuxt-App für Public + Admin + API
- **Runtime-Daten bleiben lokal:** `.env`, `data/`, `uploads/` werden nicht in dasselbe Deploy-Repo committed
- **Keine Tests:** Kein Testing-Framework konfiguriert
- **Kein Linter/Formatter:** Kein ESLint, Prettier oder Biome konfiguriert

---

## NuxtUI v4 — Wichtige Konventionen

### Layout-Wrapper
Beide Layouts (`default.vue`, `admin.vue`) nutzen `<UApp>` als Root-Wrapper. Dieser ersetzt die separaten `<UModals />`, `<USlideovers />`, `<UNotifications />` Container aus v2.

### Component-API (v4 vs. v2 Unterschiede)
| Konzept | v2 (alt) | v4 (aktuell) |
|---------|----------|--------------|
| Toggle | `UToggle` | `USwitch` |
| Modal v-model | `v-model="open"` | `v-model:open="open"` |
| Modal Content | Default Slot | **`#content` Slot** (KRITISCH!) |
| Modal prevent-close | `:prevent-close="true"` | `:dismissible="false"` |
| Select Options | `:options="items"` | `:items="items"` |
| Button gray | `color="gray"` | `color="neutral"` |
| Button white | `color="white"` | `color="neutral" variant="outline"` |
| Badge red | `color="red"` | `color="error"` |
| Badge green | `color="green"` | `color="success"` |
| Badge amber | `color="amber"` | `color="warning"` |
| Badge blue | `color="blue"` | `color="info"` |
| Alert soft | `variant="soft"` | `variant="subtle"` |
| Toast timeout | `timeout: 3000` | `duration: 3000` |
| Toast click | `click: fn` | `onClick: fn` |
| Toast color | `color: 'green'` | `color: 'success'` |
| Component `:ui` prop | `:ui="{ ... }"` | Nicht vorhanden in v4, CSS-Klassen stattdessen |
| Notifications | `<UNotifications />` pro Seite | Automatisch via `<UApp>` |

### UModal — KRITISCH: `#content` Slot verwenden!
In NuxtUI v4 ist der **Default-Slot** von `<UModal>` der **Trigger** (wird inline gerendert!). Der eigentliche Modal-Inhalt muss im **`#content` Slot** stehen. Ohne `#content` wird der Modal-Inhalt am Seitenende inline angezeigt statt als Overlay-Dialog.

```vue
<!-- FALSCH — rendert inline am Seitenende -->
<UModal v-model:open="open">
  <div class="p-6">Modal content...</div>
</UModal>

<!-- RICHTIG — rendert als Overlay-Dialog -->
<UModal v-model:open="open">
  <template #content>
    <div class="p-6">Modal content...</div>
  </template>
</UModal>
```

Alle 22 Modals in 9 Admin-Dateien nutzen dieses Pattern korrekt.

### Tailwind v4 (CSS-first)
Farben und Fonts werden in `assets/css/main.css` via `@theme` definiert:
```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

@theme static {
  --color-brand-50: #eef4ff;
  /* ... bis brand-950, silver-100 bis silver-900 */
}
```

### Auto-registrierte Module
`@nuxt/ui` v4 registriert automatisch:
- `@nuxt/icon`
- `@nuxtjs/color-mode`
- `@nuxt/fonts`

Diese Module werden **NICHT** separat in `nuxt.config.ts` modules gelistet.

### app.config.ts (v4 Slots-System)
```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
    button: {
      defaultVariants: { size: 'md' },
    },
  },
})
```

---

## Code-Konventionen

### Vue Components
- Immer `<script setup lang="ts">` verwenden
- Nuxt Auto-Imports für Composables, Components, Utils
- `definePageMeta({ layout: 'admin' })` für Admin-Seiten
- `useHead()` für SEO Meta Tags
- `useIsDark()` für Dark/Light Mode Checks

### API Endpoints
```typescript
// Dateiname: server/api/v1/[resource]/index.get.ts
export default defineEventHandler(async (event) => {
  // Query params
  const query = getQuery(event)

  // Request body (POST/PUT)
  const body = await readBody(event)

  // Auth (in admin/ automatisch via Middleware)
  const user = await requireAuth(event)

  // DB Query (Drizzle)
  const rows = db.select().from(table).where(eq(table.col, val)).all()

  // Response
  return apiSuccess(data, { count: rows.length })
  // oder: throw apiError('NOT_FOUND', 'Resource not found', 404)
})
```

### API Response Format
```typescript
// Erfolg
{ success: true, data: {...}, meta?: { count, page, ... } }

// Fehler
{ success: false, error: { code: string, message: string } }
```

### Drizzle ORM Patterns
```typescript
// SELECT
db.select().from(profiles).where(eq(profiles.isVisible, true)).orderBy(profiles.sortOrder).all()

// INSERT
db.insert(profiles).values({ ... }).returning().get()

// UPDATE
db.update(profiles).set({ ... }).where(eq(profiles.id, id)).run()

// DELETE
db.delete(profiles).where(eq(profiles.id, id)).run()
```

### Activity Logging
```typescript
// Nach jeder CRUD-Operation im Admin
logActivity({
  action: 'created' | 'updated' | 'deleted',
  entityType: 'profile' | 'layout' | 'wowup' | ...,
  entityId: id,
  entityName: name,
  details: 'Zusatzinfos',
  userId: user.userId
})
```

---

## Datenbank-Schema (SQLite)

| Tabelle | Zweck |
|---------|-------|
| `profiles` | Addon Import Strings (ElvUI, Plater, etc.) |
| `wowupStrings` | WowUp Package Strings |
| `characterLayouts` | UI Layouts pro Klasse/Spec |
| `fieldDefinitions` | Dynamische Feld-Definitionen pro Entity-Typ |
| `changelogs` | Changelog-Einträge (DE/EN) |
| `siteContent` | Editierbare Seitentexte (CMS) |
| `activityLog` | Admin-Aktions-Audit-Trail |
| `users` | Admin-Accounts |
| `sessions` | Login-Sessions (Token-Management) |
| `passkeys` | WebAuthn Passkey-Registrierungen |
| `apiKeys` | Externe API-Schlüssel |
| `settings` | App-weite Key-Value Settings |
| `apiLogs` | API Request Logging (Statistiken) |
| `syncHistory` | GitHub Sync History |
| `copyEvents` | Copy-Tracking für Statistiken |

**Schema-Datei:** `server/database/schema.ts`
**Timestamps:** `createdAt` und `updatedAt` als Unix Timestamps
**Booleans:** `integer({ mode: 'boolean' })`
**JSON-Felder:** Als TEXT gespeichert

---

## Styling

### Custom CSS Klassen (assets/css/main.css)
- `.glass`, `.glass-hover`, `.glass-card` — Glassmorphism-Effekte
- `.surface-panel` — größere Surface-Container für Footer, Banner und statische Infoblöcke
- `.public-nav-shell`, `.public-header-backdrop`, `.public-quick-card` — Public-Header-, Mobile-Menü- und Footer-Surfaces
- `.feature-card` — Feature-Cards mit Hover-Effekt (translateY, Border-Glow, Shadow) — genutzt auf Homepage + Guide Bottom Cards
- `.text-gradient`, `.text-gradient-subtle` — Brand Gradient Text
- `.btn-gradient`, `.btn-gradient-green` — Animierte Gradient Buttons
- `.scroll-reveal`, `.scroll-revealed` — Scroll-Animationen
- `.scroll-bounce` — Animierter Scroll-Indikator (Bounce-Animation)
- `.fade-in`, `.fade-in-delay-{1-4}` — Entrance Animations
- `.section-divider` — Horizontaler Trennstrich zwischen Sektionen
- `.addon-pill` — Addon-Name Pills auf Homepage
- `.drag-handle`, `.drag-row` — Drag & Drop Styles
- `.tab-active`, `.tab-inactive` — Tab Styling
- `.admin-fade-in`, `.admin-stagger-{1-6}` — Admin Panel Entrance Animations
- `.admin-shell`, `.admin-sidebar-shell`, `.admin-toolbar-shell`, `.admin-main-shell` — neues responsives Admin-App-Shell-System
- `.admin-panel`, `.admin-metric-card`, `.admin-empty-state`, `.admin-inline-note` — standardisierte Karten-, KPI- und Status-Surfaces
- `.admin-link`, `.admin-context-chip`, `.admin-search-trigger`, `.admin-icon-button`, `.admin-mobile-dock` — Navigation, Toolbar und Mobile-Navigation
- `.admin-table`, `.admin-table-shell`, `.admin-filterbar`, `.admin-bulkbar`, `.admin-sticky-bar` — Tabellen-, Filter-, Bulk- und Save-Bar-Patterns
- `.admin-command*` — modernisierte Command Palette
- Der Großteil der neuen Admin-Styles ist unter `.admin-shell` gescoped, damit der Public-Bereich nicht unbeabsichtigt beeinflusst wird

### Brand Colors (definiert in @theme static in main.css)
```
brand: Navy/Blue Gradient (50–950)
silver: Gray/Slate (100–900)
Primary: blue | Neutral: slate
```

### Dark/Light Mode
- Default: Dark Mode
- `@nuxtjs/color-mode` (auto-registriert durch @nuxt/ui v4)
- `useIsDark()` Composable für Template-Checks
- Toggle-Button in beiden Layouts

---

## Umgebungsvariablen

```bash
NUXT_ADMIN_PASSWORD=       # Admin Passwort (wird gehashed)
NUXT_JWT_SECRET=           # JWT Secret (64 Zeichen)
NUXT_AUTH_COOKIE_NAME=     # Optionaler Cookie-Name für Admin-Session
NUXT_API_KEY=              # API Key für GitHub Actions
NUXT_GITHUB_TOKEN=         # GitHub Personal Access Token
NUXT_GITHUB_REPO=          # GitHub Repo (Owner/Repo)
NUXT_GITHUB_WEBHOOK_SECRET= # Webhook Secret
NUXT_WEBAUTHN_RP_ID=       # Optional: RP ID für Passkeys
NUXT_WEBAUTHN_ORIGIN=      # Optional: erwarteter Origin für Passkeys
```

---

## Seiten-Architektur

### Public Pages
- **Homepage (`index.vue`):** Hero mit Badge, Titel, Stats, Supported Addons, Scroll-Indikator (sticky bottom-4 z-10 mit backdrop-blur Overlay), Features Section (1 primary full-width + 2 grid-cols-2 = 3 `feature-card`). Wichtig: kein eigener Hero-Glass-Wrapper mehr, sondern derselbe Seitenhintergrund wie auf `strings.vue`, `guide.vue` etc.
- **Guide (`guide.vue`):** Oberer Bereich nutzt denselben Seitenhintergrund wie `strings.vue` und keine separate Hero-Box mehr. Stattdessen nur noch zentrierter Titel/Subtitel, darunter card-basierte Step-Panels, Sticky "Quick Flow"-Sidebar, "After Setup"-Links und Admin-Inline-Edit-Modus. Step-Content wird als Markdown via `marked` gerendert und vor `v-html` sanitisiert (Client via DOMPurify, SSR via eigener Sanitize-Funktion), damit Inhalte wie `**WowUp Required**` korrekt formatiert erscheinen.
- **Strings (`strings.vue`):** Addon-Tabs + StringCard Grid mit Copy-Tracking
- **Changelog (`changelog.vue`):** Timeline mit Pagination

### Public Layout Features (`layouts/default.vue`)
- Sticky Public-Header mit `public-nav-shell` und zusätzlichem `public-header-backdrop`
- Hamburger-Menü ist bewusst nur auf Mobile sichtbar und öffnet dort als klares Overlay-Panel
- Breadcrumbs sind im Public-Bereich bewusst entfernt, um die kleine Seitenstruktur ruhiger zu halten
- Wenn eingeloggt, sitzt die Public-Admin-Leiste direkt im Header-Container und scrollt sticky mit der Navbar mit
- Public-Admin-Leiste soll dieselbe Breite/Hierarchie wie der Header haben, keine separate große Card im Content-Bereich

### Admin Content Editors
- **Dashboard (`admin/index.vue`):** reduziertes Operations-Dashboard mit Top-Metrics, einer Primäraktion, kompaktem Ops-Status, Activity Feed und 7-Tage-Trend
- **String-Verwaltung (`admin/strings/profiles.vue`, `wowup.vue`, `layouts.vue`):** einheitliche `AdminPageHeader` + `AdminPanel` Struktur, KPI-Leiste, Suche/Filter, modernisierte Tabellen, Bulk-Selection und Empty States
- **System-/Content-Seiten (`admin/content/home.vue`, `admin/system/settings.vue`, `stats.vue`, `github.vue`, `users.vue`):** standardisierte PageHeader- und StickyBar-Patterns für konsistente Actions, Status-Hinweise und Save-Flows
- **Guide Editor (`admin/content/guide.vue`):** Dynamische Steps mit TipTap, Drag-Reorder, eigener Preview-Tab mit vertikaler Timeline und Bottom-Cards Preview. Preview ist aktuell nicht 1:1 identisch zur neuen Public-Guide-Ansicht.
- **Changelog Editor (`admin/content/changelog.vue`):** CRUD mit TipTap, Pagination (UButton)

### Admin Layout Features (`layouts/admin.vue`)
- kollabierbare Desktop-Sidebar plus Mobile-Slide-In mit sauberer Active-State-Logik
- `useAdminNavigation()` liefert Sections, Seitenkontext, Command-Palette-Items und Mobile-Dock-Links aus einer zentralen Quelle
- Sticky Top-Toolbar mit integrierter Seitenüberschrift, Bereich, Hint, Search Trigger, Notification Tray und Theme Toggle
- Mobile Bottom Dock für schnellen Zugriff auf die wichtigsten Admin-Bereiche
- `CommandPalette.vue` nutzt dieselben Navigationsdaten wie Sidebar und Toolbar
- Keyboard Shortcuts (`?` Taste öffnet Modal, `g d`/`g p`/`g w`/`g l`/`g s`/`g a` Navigation)
- `<UApp>` Wrapper für NuxtUI v4 Teleportation

---

## Bekannte Issues & TODOs

### ERLEDIGT
- [x] **Admin Redesign System:** neues responsives Admin-Shell-System mit zentraler Navigation, Command Palette, Mobile Dock und wiederverwendbaren UI-Primitives
- [x] **Core Admin Screens Refresh:** Dashboard sowie Profiles/WowUp/Layouts/Home/Settings/Stats/GitHub/Users auf konsistente Header-, Panel-, Table- und Sticky-Bar-Patterns umgestellt
- [x] **UModal #content Slot Fix:** Alle 22 Modals in 9 Admin-Dateien auf `<template #content>` umgestellt
- [x] **Light-Mode Fixes:** Modal Borders, Table Headers, Table Borders in profiles/wowup/layouts
- [x] **Admin Header Context:** Header arbeitet mit Section-/Title-Kontext statt klassischer Breadcrumb-Leiste
- [x] **Keyboard Shortcuts:** `?` öffnet Modal, `g d`/`g p` etc. für Navigation
- [x] **Guide Admin Preview:** Preview-Tab im Guide-Editor mit eigener Timeline-Darstellung vorhanden
- [x] **Guide Bottom Cards:** 3 feature-card Links (Strings, WowUp, FAQ) mit Hover-Highlighting
- [x] **Homepage Scroll-Indikator:** Sticky overlay mit backdrop-blur, immer sichtbar
- [x] **Changelog Pagination:** UButton statt raw `<button>`
- [x] **Public Header Cleanup:** Mobile-Hamburger nur noch auf Mobile, Breadcrumbs entfernt, Footer ausgedünnt
- [x] **Shared Public Backgrounds:** Homepage und Guide nutzen jetzt denselben Page-Background-Ansatz wie Strings/weitere Public-Seiten
- [x] **Guide Top Simplified:** Install-Guide oben ohne eigene Hero-Glassbox oder Stat-Strip, nur noch Heading auf normalem Seitenhintergrund
- [x] **Sticky Public Admin Bar:** eingeloggte Session-Leiste sitzt im sticky Public-Header und läuft beim Scrollen mit
- [x] **Public Breadcrumb Removal:** Breadcrumbs im Public-Layout wieder entfernt
- [x] **Mobile Menu Overlay:** Hamburger öffnet im Mobile-Breakpoint ein sichtbares Overlay statt eines unauffälligen In-Flow-Blocks

### VERBLEIBEND
- [ ] **OG-Image als PNG:** SVG erstellt, aber Social-Media-Crawler brauchen PNG — manuelle Konvertierung nötig
- [ ] **Apple Touch Icon PNG:** Nur Link-Tag hinzugefügt, eigentliches PNG muss erstellt werden
- [ ] **Admin Smoke Tests:** Für den großen Admin-Refactor gibt es weiterhin keine automatisierten Build-/Smoke-Checks
- [ ] **Tests hinzufügen:** Kein Testing-Framework konfiguriert (Vitest empfohlen)
- [ ] **Linter/Formatter:** ESLint + Prettier oder Biome einrichten
- [ ] **Lockfile im Repo:** Dann kann der Docker-Build auf `npm ci` umgestellt werden
- [ ] **Frontend Auth Cleanup:** Admin-Client nutzt noch `localStorage`; Backend kann schon HttpOnly-Cookies, der Client ist dafür noch nicht vollständig umgestellt
