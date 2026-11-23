(() => {
  "use strict";

  const eventName = "__meshy_to_stl_tripo_model_url__";
  const supportedExtensions = new Set(["fbx", "glb", "gltf", "obj"]);

  function publish(value) {
    if (typeof value !== "string" || !value) return;
    try {
      const url = new URL(value, location.href);
      const extension = url.pathname.split("/").pop().match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
      if (!supportedExtensions.has(extension)) return;
      window.postMessage({ source: eventName, url: url.href }, location.origin);
    } catch {
      // Ignore malformed, relative-only, or non-HTTP model URLs.
    }
  }

  const originalFetch = window.fetch;
  window.fetch = function(input, ...args) {
    publish(typeof input === "string" ? input : input?.url);
    return originalFetch.call(this, input, ...args);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    publish(typeof url === "string" ? url : String(url));
    return originalOpen.call(this, method, url, ...args);
  };
})();
