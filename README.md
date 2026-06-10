# SkyFrame

**Astrophotography planner for any observation site with horizon constraints.**

**[Live demo →](https://skyframe.netlify.app)**

SkyFrame helps astrophotographers plan their sessions by showing which targets are accessible given their specific site, telescope, and horizon constraints — including balcony walls, trees, or buildings. It is a dependency-free static web app: no build step, no backend. The OpenNGC catalog is fetched once and cached locally, with a built-in fallback catalog when the network is unavailable.

> [!NOTE]
> SkyFrame supports arbitrary observing locations worldwide. However, the current curated catalog, seasonal labels, and editorial recommendations are primarily tuned for northern hemisphere usage.

---

## Features

- **Targets** — catalog of deep-sky objects + planets, with 1–5★ editorial ratings for your field of view
- **Curves** — altitude vs. time chart with twilight gradient, moonlight overlay, and "lights off" zone
- **Planner** — session planning with exportable list and night timeline
- **Config** — site profile, instrument, and horizon constraint setup
- Dynamic planet positions (Jupiter, Saturn, Mars) via Meeus orbital elements (~1–2° accuracy)
- Double-edge horizon model: configurable west and east obstacle profiles
- Stellarium-style lunar impact visualization (teal band with phase %)
- OpenNGC catalog integration (dynamic, cached 7 days) with ~500 scored objects + static fallback
- Night / Dim / Day themes
- No build step, no backend — a single static page with local caching

---

## Quick start

No build step required. Just open `index.html` in a browser:

```bash
git clone https://github.com/sparrowjack63/SkyFrame.git
cd SkyFrame
open index.html   # or use a local HTTP server
```

To use a local HTTP server (needed for some browsers when loading the OpenNGC catalog):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

**First run**: SkyFrame loads with a Paris default profile. Go to **Config → Location** to enter your GPS coordinates, or load a site profile JSON (see [Site Profiles](docs/site-profiles.md)).

---

## Project structure

```
skyframe/
├── index.html              # App entry point (HTML structure + script loading)
├── css/
│   └── skyframe.css        # All styles and theme variables
├── js/
│   ├── main.js             # Bootstrap, global state
│   ├── config.js           # Constants and default configuration
│   ├── astro/              # Astronomical calculations
│   │   ├── core.js         # Coordinates, accessibility, light pollution
│   │   ├── night.js        # Sun, twilight, astronomical night, Moon profile
│   │   └── planets.js      # Planetary position calculations (Meeus)
│   ├── data/               # Static datasets
│   │   ├── catalog.js      # 101-object fallback catalog
│   │   ├── planets.js      # Planet metadata
│   │   └── ratings.js      # Editorial ratings and annotations
│   ├── catalog/            # Catalog loading, search, and filtering
│   │   ├── load.js         # OpenNGC CSV parsing and caching
│   │   ├── meta.js         # Catalog stats and display
│   │   ├── filter.js       # Filters, sorting, accessibility
│   │   ├── search.js       # Text search and index
│   │   └── scoring.js      # Dynamic object scoring (0–100)
│   ├── chart/              # Altitude chart
│   │   ├── render.js       # Chart drawing (canvas)
│   │   └── hover.js        # Hover interaction and tooltip
│   ├── ui/                 # UI components
│   │   ├── targets.js      # Target grid rendering
│   │   ├── modal.js        # Object detail modal
│   │   ├── clock.js        # Night slider and clock
│   │   └── settings.js     # Settings page
│   └── planner/            # Session planner
│       ├── core.js         # Planning windows, light segments, timeline
│       └── render.js       # Planner rendering
├── profiles/
│   └── example.json        # Example site profile (Paris)
├── tests/
│   └── astro.test.js       # Unit tests for js/astro/* (node:test)
└── docs/
    └── site-profiles.md    # Site profile format documentation
```

---

## Tests

Unit tests cover the astronomical calculations (`js/astro/*`) and the HTML-escaping helpers. They use the built-in Node.js test runner — no dependency to install (Node ≥ 18):

```bash
node --test tests/astro.test.js
```

---

## Site profiles

SkyFrame is fully configurable via JSON site profiles. A profile sets your location, telescope, sensor, horizon constraints, and local lighting conditions.

Copy `profiles/example.json` and customize it for your site. See [docs/site-profiles.md](docs/site-profiles.md) for the full format reference.

```json
{
  "name": "My site",
  "site": { "lat": 48.8566, "lon": 2.3522 },
  "instrument": { "focal": 450, "sensor": "apsc" },
  "horizon": {
    "enabled": false,
    "azMin": 0, "azMax": 360,
    "altMin": 20
  }
}
```

Your personal profile (`profiles/default.json`) is excluded from version control via `.gitignore` — set it up once locally and it persists.

---

## Scoring system

Each object gets a dynamic score (0–100) based on:

- **sA** (0–40): Surface brightness — penalizes large, faint objects
- **sB** (0–35): Angular size — rewards objects that fill the field
- **sC** (0–25): Group bonus — rewards rich fields with multiple objects in frame

Objects from the editorial catalog (`CUSTOM_META`) are always included regardless of score.

---

## Object catalog

SkyFrame uses a two-layer catalog approach:

1. **OpenNGC** (dynamic): fetched from jsDelivr CDN (pinned to a fixed OpenNGC release — see `OPENNGC_VERSION` in `js/catalog/load.js`), parsed and cached for 7 days. Filtered to objects visible from the configured latitude, sized above 3.4', and with acceptable surface brightness.
2. **Fallback catalog**: 101 curated objects used when offline or if OpenNGC fails to load.
3. **Sharpless catalog**: Sh2 nebulae are always merged in (not present in OpenNGC).

Top-N objects (default: 100, configurable) are selected by score. Editorially-curated objects are always included.

---

## Technology

- **Vanilla HTML/CSS/JS** — no framework, no build step, no npm
- **Static web app** — no backend; catalog and settings cached in LocalStorage (no service worker yet, so the page itself still requires the network to load)
- **Canvas** — chart rendering
- **LocalStorage** — settings, planning, catalog cache
- **OpenNGC** — open-source deep-sky catalog via CDN

---

## License

GNU AGPL v3.0 or later — see [LICENSE](LICENSE).

If you run a modified version of SkyFrame for users over a network, AGPL requires making the corresponding source available to those users.
