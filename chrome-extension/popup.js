const linksSelect = document.getElementById("links");
const formatSelect = document.getElementById("format");
const scanButton = document.getElementById("scan");
const convertButton = document.getElementById("convert");
const statusEl = document.getElementById("status");
const progress = document.getElementById("progress");
const sandboxFrame = document.getElementById("sandbox");

let jobId = 0;
let activeProvider = "unknown";
let modelLinks = [];

function setBusy(isBusy, text) {
  scanButton.disabled = isBusy;
  convertButton.disabled = isBusy;
  progress.hidden = !isBusy;
  statusEl.textContent = text;
}

function providerForUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "tripo3d.ai" || host.endsWith(".tripo3d.ai")) return "tripo";
    if (host === "meshy.ai" || host.endsWith(".meshy.ai")) return "meshy";
  } catch { /* Ignore invalid URLs. */ }
  return "unknown";
}

function extensionFromUrl(value) {
  try {
    return new URL(value).pathname.split("/").pop().match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
  } catch { return ""; }
}

function isProviderUrl(value, provider) {
  if (!value || typeof value !== "string") return false;
  try {
    const path = new URL(value).pathname.toLowerCase();
    if (provider === "meshy") return /\.meshy$/i.test(path) || path.includes("misc/cdn-models");
    if (provider === "tripo") return /\.(?:glb|gltf|fbx|obj)$/i.test(path);
  } catch { /* Ignore invalid URLs. */ }
  return false;
}

function baseNameFromUrl(value) {
  try {
    const path = new URL(value).pathname.split("/").pop() || "model";
    return decodeURIComponent(path).replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "") || "model";
  } catch { return "model"; }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Could not access the current tab.");
  return tab;
}

async function getLinksFromActiveTab() {
  const tab = await getActiveTab();
  activeProvider = providerForUrl(tab.url || "");
  if (activeProvider === "unknown") return [];
  const all = new Set();

  const remembered = await chrome.runtime.sendMessage({
    type: "get-model-requests", tabId: tab.id, provider: activeProvider,
  }).catch(() => null);
  for (const link of remembered?.links || []) all.add(link);

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "scan-model-links" });
    for (const link of response?.links || []) all.add(link);
  } catch {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (provider) => {
        const urls = new Set();
        const accept = (value) => {
          try {
            const url = new URL(value, location.href);
            const path = url.pathname.toLowerCase();
            if (provider === "meshy" ? /\.meshy$/i.test(path) || path.includes("misc/cdn-models") : /\.(?:glb|gltf|fbx|obj)$/i.test(path)) urls.add(url.href);
          } catch { /* Ignore invalid URLs. */ }
        };
        performance.getEntriesByType("resource").forEach((entry) => accept(entry.name));
        document.querySelectorAll("a[href],[src],[data-src],[data-url],[data-model-url]").forEach((el) => {
          for (const attr of ["href", "src", "data-src", "data-url", "data-model-url"]) accept(el.getAttribute(attr));
        });
        for (const match of document.documentElement.innerHTML.matchAll(/https?:\/\/[^"'<>\\\s]+/gi)) accept(match[0]);
        return [...urls].slice(0, 50);
      },
      args: [activeProvider],
    });
    for (const link of result?.result || []) all.add(link);
  }
  return [...all].filter((url) => isProviderUrl(url, activeProvider)).slice(0, 50);
}

function fillLinks(links) {
  modelLinks = links;
  linksSelect.replaceChildren();
  for (const link of links) {
    const option = document.createElement("option");
    option.value = link;
    const ext = extensionFromUrl(link);
    option.textContent = `${ext.toUpperCase()} · ${link}`;
    linksSelect.append(option);
  }
  if (linksSelect.options.length) linksSelect.selectedIndex = 0;
  updateFormatChoices();
}

function updateFormatChoices() {
  const url = linksSelect.value;
  const ext = extensionFromUrl(url);
  const tripo = activeProvider === "tripo";
  for (const option of formatSelect.options) {
    const directOnly = ["fbx", "gltf"].includes(option.value);
    option.hidden = directOnly && (!tripo || ext !== option.value);
  }
  if (tripo && ["fbx", "gltf"].includes(ext)) formatSelect.value = ext;
  else if (tripo && ext === "obj") formatSelect.value = "obj";
  else if (!tripo && ["fbx", "gltf"].includes(formatSelect.value)) formatSelect.value = "stl";
  convertButton.textContent = activeProvider === "tripo" && formatSelect.value === ext
    ? `Download ${ext.toUpperCase()}`
    : `Download ${formatSelect.value.toUpperCase()}`;
}

function downloadBlob(blob, filename) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    chrome.downloads.download({ url: objectUrl, filename, conflictAction: "uniquify", saveAs: false }, (downloadId) => {
      const error = chrome.runtime.lastError;
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      if (error) reject(new Error(error.message));
      else resolve(downloadId);
    });
  });
}

function convertInSandbox(buffer, format, provider) {
  return new Promise((resolve, reject) => {
    const id = ++jobId;
    const onMessage = (event) => {
      if (event.source !== sandboxFrame.contentWindow || event.data?.id !== id) return;
      window.removeEventListener("message", onMessage);
      if (event.data.ok) resolve(event.data.output);
      else reject(new Error(event.data.error || "Conversion failed"));
    };
    window.addEventListener("message", onMessage);
    sandboxFrame.contentWindow.postMessage({ type: "convert", id, format, provider, buffer }, "*", [buffer]);
  });
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url, { credentials: "include", redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

async function scan() {
  try {
    setBusy(true, "Detecting provider and searching for model files...");
    const links = await getLinksFromActiveTab();
    fillLinks(links);
    const providerName = activeProvider === "tripo" ? "Tripo" : activeProvider === "meshy" ? "Meshy" : "supported provider";
    statusEl.textContent = links.length
      ? `${providerName}: ${links.length} model file(s) found.`
      : activeProvider === "unknown"
        ? "Open a Meshy or Tripo model page, then scan again."
        : `No ${activeProvider === "tripo" ? "GLB, GLTF, FBX, or OBJ" : ".meshy"} file found. Reload the model page and try again.`;
  } catch (error) {
    statusEl.textContent = `Scan error: ${error.message}`;
  } finally {
    setBusy(false, statusEl.textContent);
  }
}

scanButton.addEventListener("click", scan);
linksSelect.addEventListener("change", updateFormatChoices);
formatSelect.addEventListener("change", updateFormatChoices);

convertButton.addEventListener("click", async () => {
  const url = linksSelect.value;
  if (!url) {
    statusEl.textContent = "No model file selected.";
    return;
  }

  try {
    const format = formatSelect.value;
    const sourceExt = extensionFromUrl(url);
    setBusy(true, `Downloading ${sourceExt.toUpperCase()}...`);
    const buffer = await fetchArrayBuffer(url);
    let output;
    if (activeProvider === "tripo" && format === sourceExt) {
      output = buffer;
    } else if (activeProvider === "tripo" && sourceExt === "glb" && ["stl", "obj"].includes(format)) {
      setBusy(true, `Converting Tripo GLB to ${format.toUpperCase()}...`);
      output = await convertInSandbox(buffer, format, "tripo");
    } else if (activeProvider === "meshy" && sourceExt === "meshy") {
      setBusy(true, format === "glb" ? "Decoding Meshy model..." : `Decoding and converting to ${format.toUpperCase()}...`);
      output = await convertInSandbox(buffer, format, "meshy");
    } else {
      throw new Error(`Conversion from ${sourceExt.toUpperCase()} to ${format.toUpperCase()} is not supported. Tripo STL/OBJ export currently requires a GLB source.`);
    }
    const mimeTypes = { stl: "model/stl", obj: "model/obj", glb: "model/gltf-binary", fbx: "application/octet-stream", gltf: "model/gltf+json" };
    await downloadBlob(new Blob([output], { type: mimeTypes[format] || "application/octet-stream" }), `${baseNameFromUrl(url)}.${format}`);
    statusEl.textContent = `${format.toUpperCase()} downloaded.`;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  } finally {
    setBusy(false, statusEl.textContent);
  }
});

document.addEventListener("DOMContentLoaded", scan);
