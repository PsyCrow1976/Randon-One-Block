# Pack logo

CurseForge requires a **square avatar, minimum 400×400 pixels**, PNG recommended.

## Files

| File | Purpose |
|------|---------|
| `logo.svg` | Source artwork (version-controlled) |
| `logo.png` | **Upload this** to CurseForge (generate locally, not committed) |

## Export PNG from SVG

**Inkscape / GIMP:** open `logo.svg` → export 400×400 PNG.

**Command line (if `rsvg-convert` or Inkscape is installed):**

```bash
# Inkscape
inkscape branding/logo/logo.svg --export-filename=branding/logo/logo.png -w 400 -h 400

# librsvg
rsvg-convert -w 400 -h 400 branding/logo/logo.svg -o branding/logo/logo.png
```

Add `branding/logo/logo.png` to `.gitignore` if you prefer not to commit the raster (optional).

## Design

Simple skyblock island: **3×3 grass blocks** (isometric) with a **purple mystery block** (`?`) on the center — the random block you mine. Light blue sky background, pack name above.