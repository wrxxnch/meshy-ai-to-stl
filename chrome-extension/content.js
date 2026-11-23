function detectProvider(pageUrl = location.href) {
  try {
    const host = new URL(pageUrl).hostname.toLowerCase();
    if (host === "tripo3d.ai" || host.endsWith(".tripo3d.ai")) return "tripo";
    if (host === "meshy.ai" || host.endsWith(".meshy.ai")) return "meshy";
  } catch {
    // Ignore invalid URLs.
  }
  return "unknown";
}

function isModelUrl(value, provider = detectProvider()) {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value, location.href);
    const path = url.pathname.toLowerCase();
    if (provider === "meshy") {
      return /\.meshy$/i.test(path) || path.includes("misc/cdn-models");
    }
    if (provider === "tripo") {
      return /\.(?:glb|gltf|fbx|obj)$/i.test(path);
    }
  } catch {
    // Ignore invalid or script-only URLs.
  }
  return false;
}

function collectModelLinks() {
  const provider = detectProvider();
  const urls = new Set();
  const add = (value) => {
    if (isModelUrl(value, provider)) {
      try { urls.add(new URL(value, location.href).href); } catch { /* Ignore invalid URLs. */ }
    }
  };

  document.querySelectorAll("a[href]").forEach((el) => add(el.getAttribute("href")));
  document.querySelectorAll("[src]").forEach((el) => add(el.getAttribute("src")));
  document.querySelectorAll("[data-src],[data-url],[data-model-url]").forEach((el) => {
    add(el.getAttribute("data-src"));
    add(el.getAttribute("data-url"));
    add(el.getAttribute("data-model-url"));
  });
  performance.getEntriesByType("resource").forEach((entry) => add(entry.name));

  const html = document.documentElement.innerHTML;
  for (const match of html.matchAll(/https?:\/\/[^"'<>\\\s]+/gi)) add(match[0]);

  const links = [...urls].slice(0, 50);
  for (const url of links) {
    chrome.runtime.sendMessage({ type: "remember-model-url", url, provider }).catch(() => {});
  }
  return { provider, links };
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  if (event.data?.source !== "__meshy_to_stl_tripo_model_url__") return;
  const provider = detectProvider();
  if (provider !== "tripo" || !isModelUrl(event.data.url, provider)) return;
  chrome.runtime.sendMessage({
    type: "remember-model-url",
    url: event.data.url,
    provider,
  }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "scan-model-links") return;
  sendResponse(collectModelLinks());
});
