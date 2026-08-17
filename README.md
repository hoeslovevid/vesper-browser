# Vesper

A privacy-first Firefox fork with Zen-class chrome: vertical tabs, workspaces, split view, and motion — plus Firefox extensions from [addons.mozilla.org](https://addons.mozilla.org).

Vesper is based on [Zen Browser](https://github.com/zen-browser/desktop) and Mozilla Firefox (MPL-2.0). It is **not** affiliated with Mozilla or the Zen OSS Team.

| Channel | Version |
| --- | --- |
| Vesper | 0.1.0a (Firefox 153.0.4) |
| Vesper Dusk | unstable / tracking Firefox RC |

## What you get

- **Gecko**, not Chromium — same web engine as Firefox
- **Firefox add-ons** — we keep Firefox’s application ID so AMO-signed extensions install
- **Zen UI** — the `src/zen/` chrome (tabs, spaces, glance, animations) stays upstream-compatible
- **Hardened defaults** — telemetry off, HTTPS-Only, strict tracking protection, DNS over HTTPS, fingerprinting protection (not full RFP)

## Build (Windows)

Do not run `npm` / `mach` from `Desktop\Vesper Browser`. The space in that path breaks Python (`can't open file ...\Vesper`).

```sh
cd /c/vesper/desktop
npm run build
```

`C:\vesper\desktop` is the spaceless copy of this overlay. Do not build from `Vesper Browser` on Desktop. Install [MozillaBuild](https://firefox-source-docs.mozilla.org/setup/windows_build.html), 7-Zip, Node.js, and Rust (for `cargo` / prefs). Full notes: [docs/vesper/BUILDING.md](docs/vesper/BUILDING.md).

Full notes: [docs/vesper/BUILDING.md](docs/vesper/BUILDING.md). Privacy defaults: [docs/vesper/PRIVACY.md](docs/vesper/PRIVACY.md).

## Layout

```
configs/          branding + mozconfig
prefs/vesper/     Vesper privacy/security prefs
prefs/privatefox/ telemetry off (from Zen)
prefs/zen/        Zen UI prefs — leave these when pulling upstream
src/zen/          Zen chrome (animations, workspaces, tabs)
src/browser/      patches applied onto Firefox
engine/           Firefox source (gitignored, not in this repo)
```

Pull UI updates with the `zen` git remote. Do not rename `src/zen/` — that is how we stay mergeable.

## License

Mozilla Public License 2.0. See [LICENSE](LICENSE) and [CREDITS.md](CREDITS.md).
