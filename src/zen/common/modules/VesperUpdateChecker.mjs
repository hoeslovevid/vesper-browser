// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const ENABLED_PREF = "vesper.updates.enabled";
const REPO_PREF = "vesper.updates.github-repo";
const INTERVAL_PREF = "vesper.updates.check-interval-seconds";
const LAST_CHECK_PREF = "vesper.updates.last-check";
const LAST_NOTIFIED_PREF = "vesper.updates.last-notified-tag";
const INCLUDE_PRERELEASE_PREF = "vesper.updates.include-prerelease";
const STARTUP_DELAY_MS = 20000;

let inFlight = null;

function currentVersion() {
  return AppConstants.MOZ_APP_VERSION_DISPLAY || Services.appinfo.version;
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

function openReleasePage(url) {
  const win = browserWindow();
  win.openTrustedLinkIn(url, "tab", {
    forceForeground: true,
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
  });
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

async function notifyAvailable(win, release) {
  const version = (release.tag_name || release.name || "").replace(/^v/i, "");
  const url =
    release.html_url ||
    `https://github.com/${Services.prefs.getStringPref(REPO_PREF)}/releases/latest`;
  await win.gZenUIManager.showToast("vesper-updates-available", {
    timeout: 25000,
    version,
    l10nArgs: { version },
    descriptionId: "vesper-updates-available-description",
    button: {
      id: "vesper-updates-download-button",
      command: () => openReleasePage(url),
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
} = {}) {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    const win = browserWindow();
    if (!win?.gZenUIManager) {
      return { status: "no-window" };
    }
    win.MozXULElement.insertFTLIfNeeded("browser/vesper-updates.ftl");

    if (
      !Services.prefs.getBoolPref(ENABLED_PREF, true) ||
      (!force &&
        (win.gZenUIManager.testingEnabled || Services.env.get("MOZ_HEADLESS")))
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

    try {
      const release = await fetchLatestRelease(
        repo,
        Services.prefs.getBoolPref(INCLUDE_PRERELEASE_PREF, false)
      );
      Services.prefs.setIntPref(LAST_CHECK_PREF, now);
      if (!release) {
        if (interactive) {
          win.gZenUIManager.showToast("vesper-updates-none", { timeout: 4000 });
        }
        return { status: "none" };
      }

      const tag = release.tag_name || release.name || "";
      const local = currentVersion();
      if (!isNewerVersion(tag, local)) {
        if (interactive) {
          win.gZenUIManager.showToast("vesper-updates-up-to-date", {
            timeout: 4000,
            l10nArgs: { version: local },
          });
        }
        return { status: "current", tag, local };
      }

      const lastNotified = Services.prefs.getStringPref(LAST_NOTIFIED_PREF, "");
      if (!force && lastNotified === tag) {
        return { status: "already-notified", tag };
      }

      await notifyAvailable(win, release);
      Services.prefs.setStringPref(LAST_NOTIFIED_PREF, tag);
      return { status: "available", tag, local };
    } catch (error) {
      console.warn("Vesper update check failed", error);
      if (interactive) {
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
