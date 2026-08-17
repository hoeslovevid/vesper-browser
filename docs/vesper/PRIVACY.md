# Vesper privacy defaults

Vesper aims for a daily-driver that is quieter than Firefox without the breakage of Tor Browser or full Resist Fingerprinting.

## Locked (users cannot turn these back on in about:config)

From `prefs/privatefox/`:

- Telemetry, studies, Normandy
- Health report / data submission
- “More from Mozilla” and VPN promo chrome

## Default, but overridable

From `prefs/vesper/`:

| Area | Default |
| --- | --- |
| Tracking | Strict ETP, social + email tracking on |
| Fingerprinting | Firefox Fingerprinting Protection (FPP), **not** RFP |
| HTTPS | HTTPS-Only Mode |
| DNS | DNS over HTTPS via Quad9, with system DNS fallback |
| Referrers | Cross-origin trimmed to host |
| Prefetch | DNS prefetch, link prefetch, speculative connections off |
| Query stripping | On |
| Cookie banners | Reject all when possible |
| Safe Browsing | Malware/phishing lists on; Google download-hash lookup off |
| Add-ons | Mozilla-signed AMO extensions required |

## Why not Resist Fingerprinting?

RFP (`privacy.resistFingerprinting`) is stronger, and it also breaks canvas, timezone, many sites, and some extensions. Vesper ships FPP instead. You can enable RFP yourself in `about:config` if you want that tradeoff.

## Why not disable Firefox Sync?

Sync is opt-in. Vesper does not create an account for you. Disabling the feature entirely would surprise people moving from Firefox or Zen.

## Add-ons

Keep `MOZ_APP_ID={ec8030f7-c20a-464f-9b0e-13a3a9e97384}`. Changing it is how forks lose addons.mozilla.org.

Do not compile with a different application ID to “look more independent.” Branding is the name and icons; compatibility is the GUID.
