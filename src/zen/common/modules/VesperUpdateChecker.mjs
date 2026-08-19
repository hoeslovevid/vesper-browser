// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { Downloads } from "resource://gre/modules/Downloads.sys.mjs";

const ENABLED_PREF = "vesper.updates.enabled";
const REPO_PREF = "vesper.updates.github-repo";
const INTERVAL_PREF = "vesper.updates.check-interval-seconds";
const LAST_CHECK_PREF = "vesper.updates.last-check";
const LAST_NOTIFIED_PREF = "vesper.updates.last-notified-tag";
const INCLUDE_PRERELEASE_PREF = "vesper.updates.include-prerelease";
const CURRENT_VERSION_PREF = "vesper.updates.current-version";
const STARTUP_DELAY_MS = 20000;

let inFlight = null;

export function currentVersion() {
  const pinned = Services.prefs.getStringPref(CURRENT_VERSION_PREF, "");
  if (pinned) {
    return pinned;
  }
  const display =
    AppConstants.MOZ_APP_VERSION_DISPLAY || Services.appinfo.version;
  // Unofficial Firefox configure uses 1.0.0, which is not the Vesper tag.
  if (/^1\.0\.0/.test(display) || display === "154.0") {
    return "0.0.0";
  }
  return display;
}

function splitVersion(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^v/i, "");
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)$/);
  if (!match) {
    return { nums: [0, 0, 0], rest: cleaned };
  }
  return {
    nums: [
      Number(match[1]),
      Number(match[2] || 0),
      Number(match[3] || 0),
    ],
    rest: match[4] || "",
  };
}

export function isNewerVersion(remote, local) {
  const a = splitVersion(remote);
  const b = splitVersion(local);
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) {
      return a.nums[i] > b.nums[i];
    }
  }
  if (!a.rest && b.rest) {
    return true;
  }
  if (a.rest && !b.rest) {
    return false;
  }
  return a.rest > b.rest;
}

function browserWindow() {
  return Services.wm.getMostRecentWindow("navigator:browser");
}

export function pickInstallerAsset(release) {
  const assets = release?.assets || [];
  return (
    assets.find(asset => /win64.*\.exe$/i.test(asset.name)) ||
    assets.find(asset => /windows.*\.exe$/i.test(asset.name)) ||
    assets.find(asset => /\.exe$/i.test(asset.name)) ||
    null
  );
}

async function fetchLatestRelease(repo, includePrerelease) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Vesper-Browser-Update-Checker",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const endpoint = includePrerelease
    ? `https://api.github.com/repos/${repo}/releases`
    : `https://api.github.com/repos/${repo}/releases/latest`;
  const response = await fetch(endpoint, {
    headers,
    credentials: "omit",
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub releases request failed: ${response.status}`);
  }
  const data = await response.json();
  if (Array.isArray(data)) {
    return (
      data.find(item => !item.draft && (includePrerelease || !item.prerelease)) ||
      null
    );
  }
  return data.draft ? null : data;
}

export async function downloadGithubInstaller(release, { onProgress } = {}) {
  const asset = pickInstallerAsset(release);
  if (!asset?.browser_download_url) {
    throw new Error("No Windows installer was attached to the GitHub release");
  }
  const dir = await Downloads.getPreferredDownloadsDirectory();
  const sep = AppConstants.platform === "win" ? "\\" : "/";
  const target = `${dir.replace(/[\\/]+$/, "")}${sep}${asset.name}`;
  const list = await Downloads.getList(Downloads.ALL);
  const download = await Downloads.createDownload({
    source: asset.browser_download_url,
    target,
  });
  await list.add(download);
  if (onProgress) {
    download.onchange = () => {
      onProgress(download.currentBytes || 0, download.totalBytes || -1);
    };
  }
  await download.start();
  if (!download.succeeded) {
    throw new Error(download.error?.message || "GitHub installer download failed");
  }
  const file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  file.initWithPath(download.target.path);
  file.launch();
  return download;
}

async function notifyAvailable(win, release) {
  const version = (release.tag_name || release.name || "").replace(/^v/i, "");
  await win.gZenUIManager.showToast("vesper-updates-available", {
    timeout: 25000,
    version,
    l10nArgs: { version },
    descriptionId: "vesper-updates-available-description",
    button: {
      id: "vesper-updates-download-button",
      command: () => {
        downloadGithubInstaller(release).catch(error => {
          console.warn("Vesper installer download failed", error);
          win.gZenUIManager.showToast("vesper-updates-check-failed", {
            timeout: 5000,
          });
        });
      },
    },
  });
  const button = win.document.getElementById("vesper-updates-download-button");
  if (button) {
    win.document.l10n.setAttributes(button, "vesper-updates-download");
  }
}

export async function checkForVesperUpdates({
  force = false,
  interactive = false,
  notify = true,
} = {}) {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    const win = browserWindow();
    if (win) {
      win.MozXULElement.insertFTLIfNeeded("browser/vesper-updates.ftl");
    }

    if (
      !Services.prefs.getBoolPref(ENABLED_PREF, true) ||
      (!force &&
        (win?.gZenUIManager?.testingEnabled || Services.env.get("MOZ_HEADLESS")))
    ) {
      return { status: "disabled" };
    }

    const now = Math.floor(Date.now() / 1000);
    const interval = Services.prefs.getIntPref(INTERVAL_PREF, 86400);
    const lastCheck = Services.prefs.getIntPref(LAST_CHECK_PREF, 0);
    if (!force && now - lastCheck < interval) {
      return { status: "skipped" };
    }

    const repo = Services.prefs.getStringPref(REPO_PREF, "");
    if (!repo.includes("/")) {
      return { status: "misconfigured" };
    }

    const showToast = id => {
      if (notify && interactive && win?.gZenUIManager) {
        win.gZenUIManager.showToast(id, { timeout: 4000 });
      }
    };

    try {
      const release = await fetchLatestRelease(
        repo,
        Services.prefs.getBoolPref(INCLUDE_PRERELEASE_PREF, false)
      );
      Services.prefs.setIntPref(LAST_CHECK_PREF, now);
      if (!release) {
        showToast("vesper-updates-none");
        return { status: "none" };
      }

      const tag = release.tag_name || release.name || "";
      const local = currentVersion();
      if (!isNewerVersion(tag, local)) {
        if (notify && interactive && win?.gZenUIManager) {
          win.gZenUIManager.showToast("vesper-updates-up-to-date", {
            timeout: 4000,
            l10nArgs: { version: local },
          });
        }
        return { status: "current", tag, local, release };
      }

      const lastNotified = Services.prefs.getStringPref(LAST_NOTIFIED_PREF, "");
      if (!force && lastNotified === tag) {
        return { status: "already-notified", tag, local, release };
      }

      if (notify && win?.gZenUIManager) {
        await notifyAvailable(win, release);
        Services.prefs.setStringPref(LAST_NOTIFIED_PREF, tag);
      }
      return { status: "available", tag, local, release };
    } catch (error) {
      console.warn("Vesper update check failed", error);
      if (notify && interactive && win?.gZenUIManager) {
        win.gZenUIManager.showToast("vesper-updates-check-failed", {
          timeout: 5000,
        });
      }
      return { status: "error" };
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function initVesperUpdateChecker() {
  const win = browserWindow();
  if (!win || win.__vesperUpdateCheckerStarted) {
    return;
  }
  win.__vesperUpdateCheckerStarted = true;
  win.setTimeout(() => {
    checkForVesperUpdates().catch(console.warn);
  }, STARTUP_DELAY_MS);
}
