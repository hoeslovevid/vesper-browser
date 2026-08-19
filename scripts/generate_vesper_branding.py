# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Build Vesper icon sizes, ICOs, and installer bitmaps from a 1024px master PNG."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance

DARK = (18, 20, 28, 255)
GOLD = (232, 197, 138, 255)
SIZES = (16, 22, 24, 32, 48, 64, 128, 256, 512)


def trim_transparent(im: Image.Image, padding_ratio: float = 0.06) -> Image.Image:
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    bbox = im.split()[-1].getbbox()
    if not bbox:
        return im
    cropped = im.crop(bbox)
    pad = int(max(cropped.size) * padding_ratio)
    canvas = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad, pad), cropped)
    side = max(canvas.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(canvas, ((side - canvas.width) // 2, (side - canvas.height) // 2), canvas)
    return square


def resize(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def save_ico(im: Image.Image, path: Path, sizes: tuple[int, ...]) -> None:
    im.save(path, format="ICO", sizes=[(s, s) for s in sizes])


def fill_on_dark(im: Image.Image, size: tuple[int, int], scale: float = 0.62) -> Image.Image:
    canvas = Image.new("RGBA", size, DARK)
    icon_w = int(min(size) * scale)
    icon = resize(im, icon_w)
    x = (size[0] - icon.width) // 2
    y = (size[1] - icon.height) // 2
    canvas.alpha_composite(icon, (x, y))
    return canvas


def write_branding(source: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "content").mkdir(exist_ok=True)
    (dest / "stubinstaller").mkdir(exist_ok=True)

    master = trim_transparent(Image.open(source).convert("RGBA"))
    master = resize(master, 1024)
    master.save(dest / "logo.png")
    master.save(dest / "logo-mac.png")
    master.save(dest / "logo-source.png")

    for size in SIZES:
        resize(master, size).save(dest / f"logo{size}.png")
        resize(master, size).save(dest / f"default{size}.png")

    save_ico(master, dest / "firefox.ico", (16, 24, 32, 48, 64, 128, 256))
    save_ico(master, dest / "firefox64.ico", (16, 32, 48, 64))
    save_ico(master, dest / "document.ico", (16, 32, 48, 256))
    save_ico(master, dest / "document_pdf.ico", (16, 32, 48, 256))
    save_ico(master, dest / "newtab.ico", (16, 32))
    save_ico(master, dest / "newwindow.ico", (16, 32))

    pb = ImageEnhance.Color(master).enhance(0.55)
    pb = ImageEnhance.Brightness(pb).enhance(0.85)
    save_ico(pb, dest / "pbmode.ico", (16, 32, 48, 256))

    resize(master, 142).save(dest / "VisualElements_70.png")
    resize(master, 300).save(dest / "VisualElements_150.png")
    resize(pb, 142).save(dest / "PrivateBrowsing_70.png")
    resize(pb, 300).save(dest / "PrivateBrowsing_150.png")

    fill_on_dark(master, (150, 57), 0.78).convert("RGB").save(dest / "wizHeader.bmp")
    fill_on_dark(master, (150, 57), 0.78).convert("RGB").save(dest / "wizHeaderRTL.bmp")
    fill_on_dark(master, (164, 314), 0.55).convert("RGB").save(dest / "wizWatermark.bmp")
    fill_on_dark(master, (1440, 880), 0.28).save(dest / "background.png")
    fill_on_dark(master, (300, 236), 0.42).convert("RGB").save(dest / "content" / "about.png")
    fill_on_dark(master, (1344, 822), 0.22).convert("RGB").save(
        dest / "stubinstaller" / "bgstub.jpg", quality=92
    )

    resize(master, 512).save(dest / "content" / "about-logo.png")
    resize(master, 1024).save(dest / "content" / "about-logo@2x.png")
    resize(pb, 512).save(dest / "content" / "about-logo-private.png")
    resize(pb, 1024).save(dest / "content" / "about-logo-private@2x.png")

    print(f"Wrote branding assets to {dest}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--dest", required=True, type=Path)
    args = parser.parse_args()
    write_branding(args.source, args.dest)


if __name__ == "__main__":
    main()
