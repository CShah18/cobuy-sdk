// src/index.js
const CoBuySDK = {
  config: {
    apiBaseUrl: "",
    allowImpression: true,
  },

  init(options = {}) {
    this.config = { ...this.config, ...options };
    this.loadAds();
  },

  async loadAds() {
    const ads = document.querySelectorAll(".cobuy-ad");
    if (!ads.length) return;

    ads.forEach(async (ad) => {
      const campaignId = ad.dataset.campaign || "unknown";
      const brand = ad.dataset.brand || "";
      const width = ad.dataset.width || "300";
      const height = ad.dataset.height || "250";
      const apiBase = ad.dataset.apiBase || this.config.apiBaseUrl;
      const clickTracker = ad.dataset.clickTracker;
      const imageUrl = ad.dataset.image; // 🆕 optional direct image

      if (!apiBase) {
        console.error("[CoBuySDK] Missing apiBase in ad tag");
        return;
      }

      try {
        let creativeUrl = imageUrl;
        // If no direct image provided, fetch creative from API
        if (!creativeUrl) {
          const creative = await this.fetchCreative(apiBase, campaignId);
          if (!creative || !creative.url) {
            console.error("[CoBuySDK] No creative returned from API");
            return;
          }
          creativeUrl = creative.url;
        }

        this.renderCreative(ad, creativeUrl, width, height, clickTracker);

        if (this.config.allowImpression) {
          this.emitImpression({ apiBase, campaignId, brand, width, height });
        }
      } catch (err) {
        console.error("[CoBuySDK] Error loading creative:", err);
      }
    });
  },

  async fetchCreative(apiBase, campaignId) {
    const url = `${apiBase}/api/v1/creative?cid=${encodeURIComponent(
      campaignId
    )}&cb=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Creative fetch failed: ${res.status}`);
    return res.json();
  },

  renderCreative(container, creativeUrl, width, height, clickTracker) {
    // 🧹 Reset and style the ad container
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    // 🖼️ Detect if creative is an image or iframe
    const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(creativeUrl);
    let creativeEl;

    if (isImage) {
      creativeEl = document.createElement("img");
      creativeEl.src = creativeUrl;
      creativeEl.width = width;
      creativeEl.height = height;
      creativeEl.style.border = "none";
      creativeEl.style.display = "block";
    } else {
      creativeEl = document.createElement("iframe");
      creativeEl.src = creativeUrl;
      creativeEl.width = width;
      creativeEl.height = height;
      creativeEl.frameBorder = "0";
      creativeEl.scrolling = "no";
      creativeEl.style.border = "none";
    }

    container.appendChild(creativeEl);

    // 📦 Extract data for tracking
    const campaignId = container.dataset.campaign;
    const apiBase = this.config.apiBaseUrl || container.dataset.apiBase;
    const destination = clickTracker || "https://google.com"; // fallback

    // 🧭 Build your own click-tracking redirect
    // Note: do NOT encode macros like %%CLICK_URL%%
    const encodedDest = destination.includes("%%CLICK_URL%%")
      ? destination
      : encodeURIComponent(destination);

    const myClickUrl = `${apiBase}/trk/click?src=cobuy&cid=${encodeURIComponent(
      campaignId
    )}&crid=${encodeURIComponent(width + "x" + height)}&pub=web&plc=banner&dest=${encodedDest}&clid=${Date.now()}`;

    // 🖱️ Overlay clickable area
    const link = document.createElement("a");
    link.href = myClickUrl;
    link.target = "_blank";
    link.rel = "noopener";
    Object.assign(link.style, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      textDecoration: "none",
      cursor: "pointer",
    });

    // 📊 Fire local analytics + console log
    link.addEventListener("click", () => {
      this.emitEvent("click", { campaign_id: campaignId });
      console.log("[CoBuySDK] Click fired →", myClickUrl);
    });

    container.appendChild(link);
  },

  emitImpression({ apiBase, campaignId, brand, width, height }) {
    const impUrl = `${apiBase}/api/v1/tracking/imp?src=cobuy&cid=${encodeURIComponent(
      campaignId
    )}&crid=${encodeURIComponent(width + "x" + height)}&pub=web&plc=banner&cb=${Date.now()}`;
    const img = new Image(1, 1);
    img.src = impUrl;
    img.style = "position:absolute;left:-9999px;top:-9999px;";
    document.body.appendChild(img);
    console.log("[CoBuySDK] Impression fired:", impUrl);
  },

  emitEvent(type, payload = {}) {
    const url = `${this.config.apiBaseUrl}/events`;
    const body = {
      event_type: type,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((err) => console.error("[CoBuySDK] Event error:", err.message));
  },

  createShareLinks(baseUrl, utm = {}) {
    const fullUrl = this.addUTMParams(baseUrl, utm);
    const encoded = encodeURIComponent(fullUrl);
    return {
      whatsapp: `https://wa.me/?text=${encoded}`,
      sms: `sms:?body=${encoded}`,
      copy: fullUrl,
    };
  },

  addUTMParams(url, utm = {}) {
    const params = new URLSearchParams(utm).toString();
    if (!params) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${params}`;
  },
};

// Auto-run in browser
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => CoBuySDK.init());
  } else {
    CoBuySDK.init();
  }
  window.CoBuySDK = CoBuySDK;
}

export default CoBuySDK;
