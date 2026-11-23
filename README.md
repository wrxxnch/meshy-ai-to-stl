[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Z6Z329PHJO)
Support me if you want and I saved you some money :D
# Meshy To STL

Meshy To STL is a Chrome extension that automatically detects whether the active model page is Meshy or Tripo. It finds Meshy's `.meshy` model files and Tripo's GLB, GLTF, FBX, or OBJ files.

## Features

- Detects Meshy or Tripo from the active page's hostname.
- Captures Tripo model URLs from page `fetch` and `XMLHttpRequest` traffic at document start, as well as browser resource entries and page links.
- Converts Meshy `.meshy` files locally in the browser to STL, OBJ, or GLB.
- Converts Tripo GLB files locally in the browser to STL or OBJ, or downloads the original GLB.
- Downloads Tripo OBJ, FBX, and GLTF in their original format. Converting Tripo FBX/GLTF to STL/OBJ is not currently supported.
- Does not commit Meshy's loader files to this repository.

## Installation

Before loading the extension, download the local decoder files (required for Meshy files):

### Windows

```powershell
cd C:\path\to\meshy-to-stl
powershell -ExecutionPolicy Bypass -File .\setup-vendor.ps1
```

### macOS or Linux

Open Terminal in the extracted project folder and run:

```bash
sh ./setup-vendor.sh
```

Then load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the project's `chrome-extension` folder.

## Usage

1. Open a Meshy model page or a Tripo Studio model page.
2. After installing or updating the extension, reload the Tripo model page so its early network requests can be captured.
3. Click the Meshy To STL extension icon and scan the page.
4. Select the detected model file.
5. Choose an available output. Meshy files support STL, OBJ, or GLB. Tripo GLB supports STL, OBJ, or GLB; Tripo OBJ, FBX, and GLTF are downloaded in their source format.
6. Click the download button.

## Notes

- Conversion runs locally in your browser.
- `chrome-extension/vendor/mesh_loader.js` and `chrome-extension/vendor/mesh_loader.wasm` are intentionally not versioned.
- On Windows, run `setup-vendor.ps1` after cloning or extracting the project.
- On macOS or Linux, run `sh ./setup-vendor.sh` after cloning or extracting the project.
- Meshy downloads require the decoder files; Tripo model downloads and GLB conversion do not.
- STL output is binary, OBJ output contains geometry without materials, and GLB preserves the model data.
- The extension requires Google Chrome or a compatible Chromium browser; Safari is not supported.
- Sites with login, temporary URLs, or strict download permissions may require you to be logged in with the same Chrome session.
