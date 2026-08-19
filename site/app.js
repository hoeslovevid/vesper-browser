const REPO = "hoeslovevid/vesper-browser";
const FALLBACK_VERSION = "0.1.2";
const FALLBACK_HREF = `https://github.com/${REPO}/releases/latest`;

const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const header = document.querySelector(".nav");
const onScroll = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const toggle = document.querySelector(".nav-toggle");
const menu = document.querySelector(".nav-links");
toggle?.addEventListener("click", () => {
  const open = menu?.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});

menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menu.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
});

function pickWindowsAsset(release) {
  const assets = release?.assets || [];
  return (
    assets.find((asset) => /win64.*\.exe$/i.test(asset.name)) ||
    assets.find((asset) => /windows.*\.exe$/i.test(asset.name)) ||
    assets.find((asset) => /\.exe$/i.test(asset.name)) ||
    null
  );
}

async function hydrateDownload() {
  const buttons = document.querySelectorAll("[data-download]");
  const versionNodes = document.querySelectorAll("[data-version]");
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github+json" },
      }
    );
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const release = await response.json();
    const asset = pickWindowsAsset(release);
    const version = String(release.tag_name || FALLBACK_VERSION).replace(
      /^v/i,
      ""
    );
    versionNodes.forEach((node) => {
      node.textContent = version;
    });
    buttons.forEach((button) => {
      button.href = asset?.browser_download_url || release.html_url || FALLBACK_HREF;
    });
  } catch {
    versionNodes.forEach((node) => {
      node.textContent = FALLBACK_VERSION;
    });
    buttons.forEach((button) => {
      button.href = FALLBACK_HREF;
    });
  }
}

hydrateDownload();
