# Meshy To STL

Local Chrome extension that detects whether the current model page is Meshy or Tripo. Meshy `.meshy` files can be converted to STL, OBJ, or GLB. Tripo GLB files can be converted to STL or OBJ; Tripo OBJ, FBX, and GLTF files can be downloaded in their original format.

## Install

Before loading the extension, download the local decoder files (required only for Meshy):

### Windows

```powershell
cd C:\path\to\meshy-to-stl
powershell -ExecutionPolicy Bypass -File .\setup-vendor.ps1
```

### macOS or Linux

Open Terminal in the project root (the folder above `chrome-extension`) and run:

```bash
sh ./setup-vendor.sh
```

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the project's `chrome-extension` folder.

## Use

1. Open a Meshy model page or a Tripo Studio model page.
2. After installing or updating the extension, reload the Tripo model page so its early `fetch`/`XMLHttpRequest` requests can be captured.
3. Click the extension icon and scan the page.
4. Select a detected model file.
5. Choose a supported output format and click the download button.

## Notes

- Conversion runs locally in your browser.
- Tripo detection hooks model requests in the page's main JavaScript context at document start; reload the Tripo page after loading or updating the extension.
- `vendor/mesh_loader.js` and `vendor/mesh_loader.wasm` are not versioned in this repository; run the setup script on your operating system to download local copies for Meshy.
- Tripo FBX and GLTF can currently be downloaded in their original formats, but not converted to STL/OBJ. STL/OBJ conversion requires a Tripo GLB source.
- The extension requires Google Chrome or a compatible Chromium browser; Safari is not supported.
- Sites with login, temporary URLs, or strict download permissions may require you to be logged in with the same Chrome session.
