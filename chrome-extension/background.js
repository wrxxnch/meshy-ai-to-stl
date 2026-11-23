const tabModelRequests = new Map();

function isModelUrl(url, provider) {
  if (!url || typeof url !== "string") return false;
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (provider === "meshy") return /\.meshy$/i.test(path) || path.includes("misc/cdn-models");
    if (provider === "tripo") return /\.(?:glb|gltf|fbx|obj)$/i.test(path);
  } catch {
    // Ignore malformed URLs.
  }
  return false;
}

function detectProvider(pageUrl) {
  try {
    const host = new URL(pageUrl).hostname.toLowerCase();
    if (host === "tripo3d.ai" || host.endsWith(".tripo3d.ai")) return "tripo";
    if (host === "meshy.ai" || host.endsWith(".meshy.ai")) return "meshy";
  } catch {
    // Ignore invalid URLs.
  }
  return "unknown";
}

function remember(tabId, url, provider) {
  if (tabId < 0 || !isModelUrl(url, provider)) return;
  const items = tabModelRequests.get(tabId) || [];
  if (!items.some((item) => item.url === url)) items.unshift({ url, provider });
  tabModelRequests.set(tabId, items.slice(0, 50));
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    if (details.type === "main_frame") {
      tabModelRequests.delete(details.tabId);
      return;
    }
    const provider = detectProvider(details.documentUrl || "");
    remember(details.tabId, details.url, provider);
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener((tabId) => tabModelRequests.delete(tabId));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "remember-model-url" && sender.tab?.id !== undefined) {
    remember(sender.tab.id, message.url, message.provider);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "get-model-requests") {
    const provider = message.provider;
    const links = (tabModelRequests.get(message.tabId) || [])
      .filter((item) => item.provider === provider)
      .map((item) => item.url);
    sendResponse({ links });
  }
});
