# Site Profiles

SkyFrame uses JSON site profiles to describe your observation site. A profile lets you configure your geographic location, instrument, horizon constraints, and local lighting conditions without touching any code.

---

## Quick setup

1. Copy `profiles/example.json` to `profiles/default.json`
2. Edit `profiles/default.json` with your site parameters
3. Load it in SkyFrame: **Config → Load profile**

`profiles/default.json` is gitignored — your personal setup stays local.

---

## Full profile format

```json
{
  "name": "My backyard - Paris",

  "site": {
    "lat": 48.8566,
    "lon": 2.3522
  },

  "instrument": {
    "focal": 450,
    "sensor": "apsc"
  },

  "horizon": {
    "enabled": false,
    "azCenter": 90,
    "azMin": 0,
    "azMax": 360,
    "altMin": 20,
    "altMax": 90,
    "azAltMaxRef": 90,
    "azBord": 0,
    "kBord": 0,
    "azBordEst": 90,
    "kBordEst": 0
  },

  "lighting": {
    "mode": "none",
    "offTime": "22:30",
    "onTime": "06:00",
    "label": "Street lights"
  },

  "filters": {
    "available": ["neutral", "lightpollution", "dualband"]
  }
}
```

---

## Field reference

### `site`

| Field | Type | Description |
|-------|------|-------------|
| `lat` | number | Geographic latitude in decimal degrees (negative = south) |
| `lon` | number | Geographic longitude in decimal degrees (negative = west) |

### `instrument`

| Field | Type | Description |
|-------|------|-------------|
| `focal` | number | Focal length in mm |
| `sensor` | string | Sensor size: `apsc`, `ff` (full frame), or `mft` (Micro Four Thirds) |

Sensor dimensions used for field-of-view calculation:

| Code | Width | Height |
|------|-------|--------|
| `apsc` | 23.5 mm | 15.7 mm |
| `ff` | 36.0 mm | 24.0 mm |
| `mft` | 17.3 mm | 13.0 mm |

### `horizon`

Controls which part of the sky is accessible for your site.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable horizon constraints |
| `azCenter` | number | `90` | Central azimuth direction you're pointing at (degrees, 0=N, 90=E, 180=S, 270=W) |
| `azMin` | number | `0` | Minimum accessible azimuth |
| `azMax` | number | `360` | Maximum accessible azimuth |
| `altMin` | number | `20` | Minimum altitude (degrees) — raise this for atmosphere quality |
| `altMax` | number | `90` | Global altitude ceiling |
| `azAltMaxRef` | number | `90` | Azimuth at which `altMax` applies (for angled obstacles) |
| `azBord` | number | `0` | Azimuth of the west/left obstacle edge |
| `kBord` | number | `0` | West obstacle profile coefficient: `effMax = atan(kBord / |cos(az - azBord)|)` |
| `azBordEst` | number | `90` | Azimuth of the east/right obstacle edge |
| `kBordEst` | number | `0` | East obstacle profile coefficient (same formula) |

#### Horizon constraint model

When `enabled: true`, SkyFrame applies a **double-edge obstacle model**. Each edge defines a curved altitude ceiling around a reference azimuth:

```
effMax_west = atan(kBord    / |cos(az - azBord)|)
effMax_east = atan(kBordEst / |cos(az - azBordEst)|)
effMax      = min(effMax_west, effMax_east)
```

This models a balcony railing, rooftop parapet, or similar obstacle that limits altitude more severely near its edges. Set `kBord = 0` or `kBordEst = 0` to disable the corresponding edge.

**Calibration tip**: observe a known object near your horizon limit at a specific azimuth and time. Note its altitude and azimuth when it disappears behind the obstacle. Then solve for `k = tan(alt_obs) × |cos(az - azBord)|`.

### `lighting`

Models local artificial lighting conditions (street lights, etc.) that affect sky quality.

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `"none"` (always dark), `"night_off"` (scheduled lights off window), or `"always_on"` |
| `offTime` | string | Time lights turn off, `"HH:MM"` format (e.g. `"22:30"`) |
| `onTime` | string | Time lights turn on again, `"HH:MM"` format (e.g. `"06:00"`) |
| `label` | string | Display label shown in the interface |

When `mode: "night_off"`, the planner and curves view show a "lights off" zone during the dark window.

### `filters`

| Field | Type | Description |
|-------|------|-------------|
| `available` | array | Filter types you own: `"neutral"`, `"lightpollution"`, `"dualband"`, `"narrowband"` |

Available filters affect which objects show as reachable in your session:

| Code | Examples |
|------|---------|
| `neutral` | No filter, UV/IR cut, L filter |
| `lightpollution` | L-Pro, IDAS LPS, Antlia broadband |
| `dualband` | L-eXtreme, ALP-T, NBZ, Optolong D1 |
| `narrowband` | Hα, OIII, SII mono filters |

---

## Notes

- `profiles/default.json` is excluded from git (`.gitignore`). Your personal profile never ends up in version history.
- `profiles/example.json` is the tracked template — modify it to match your instrument without touching the location.
- The **Config** page in the app also lets you set location by GPS or city search (Nominatim), which writes to the same internal state as loading a profile.
