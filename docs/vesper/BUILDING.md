# Building Vesper

Vesper is a Surfer overlay on Firefox, the same architecture Zen uses. You do not vendor the full Gecko tree in git. Surfer downloads it into `engine/`.

## Machine

- Windows 10/11, 16 GB RAM (32 GB better), 80+ GB free disk
- [MozillaBuild](https://firefox-source-docs.mozilla.org/setup/windows_build.html)
- [7-Zip](https://www.7-zip.org/) (`7z` must be on PATH — Surfer uses it to unpack Firefox on Windows)
- Node.js 20+, Python 3, Git, a C++ toolchain (MozillaBuild’s bootstrap installs most of this)

After installing 7-Zip, **open a new terminal** so PATH updates. Confirm with `7z`.

On Windows, Surfer unpacks with `7z`. If `7z` is missing you get `'7z' is not recognized`. The archive can stay cached in `.surfer\engine\`; only the unpack step needs retrying.

## Path rules (Windows — read this first)

The folder `Vesper Browser` has a **space**. Python/`mach` treat that as two paths (`...\Desktop\Vesper`), which is the bootstrap error you hit. OneDrive also fights the Firefox tree.

**Always run npm/surfer from the real copy with no spaces:**

```sh
cd /c/vesper/desktop
```

`C:\vesper\desktop` is a copy of this overlay. Do not use `OneDrive\Desktop\Vesper Browser` or `C:\vesper\src` (that junction still resolves to a path with a space, and Python splits on it).

| What | Where |
| --- | --- |
| Commands (`npm run …`) | `C:\vesper\src` |
| Firefox engine | `engine\` → `C:\vesper\unpack\firefox-154.0` |
| Cursor editor | Either path; same files |

Do not run `mach` or `npm run bootstrap` from `OneDrive\Desktop\Vesper Browser`.

## Commands

```sh
npm install
npm run download    # Firefox source into engine/
npm run import      # generate prefs, apply patches, branding
npm run bootstrap   # toolchains
npm run build       # full compile
npm run build:ui    # chrome-only / artifact-style when possible
npm start           # mach run
npm run package     # installer
```

`npm run init` is download + import + bootstrap.

## After a successful build

The window should say **Vesper**, not Firefox or Zen. Extensions from addons.mozilla.org should install because `MOZ_APP_ID` is still Firefox’s GUID.

## Pulling Zen UI updates

```sh
git fetch zen
git merge zen/dev
```

Expect conflicts in `surfer.json`, `configs/common/mozconfig`, `README.md`, and branding. Keep Vesper names there. Leave `src/zen/` as Zen’s unless you have a deliberate chrome change.

## Shipping later

Before other people download this:

1. Your own GitHub repo (replace placeholder `vesper-browser/desktop`)
2. Replace Zen’s GitHub Actions under `.github/workflows/`
3. Windows Authenticode signing (otherwise SmartScreen blocks the installer)
4. An update server (`updateHostname` in `surfer.json` is empty on purpose)
5. Stay within days of Firefox security releases

## API keys

Optional files in `%USERPROFILE%\.vesper-keys\`:

- `safebrowsing.dat`
- `mozilla.dat`
- `google_location_service.dat`

Do not commit these. Safe Browsing still works in a limited way without a Google key; remote download-hash checks are off in Vesper prefs.
