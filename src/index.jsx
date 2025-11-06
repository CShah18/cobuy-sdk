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

      if (!apiBase) {
        console.error("[CoBuySDK] Missing apiBase in ad tag");
        return;
      }

      try {
        const creative = await this.fetchCreative(apiBase, campaignId);
        if (!creative || !creative.url) {
          console.error("[CoBuySDK] No creative returned from API");
          return;
        }

        this.renderCreative(ad, creative.url, width, height, clickTracker);

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
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    const iframe = document.createElement("iframe");
    iframe.src = creativeUrl;
    iframe.width = width;
    iframe.height = height;
    iframe.frameBorder = "0";
    iframe.scrolling = "no";
    iframe.style.border = "none";
    container.appendChild(iframe);

    if (clickTracker) {
      const link = document.createElement("a");
      link.href = clickTracker;
      link.target = "_blank";
      link.rel = "noopener";
      Object.assign(link.style, {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        textDecoration: "none",
      });
      link.addEventListener("click", () =>
        this.emitEvent("click", { campaign_id: campaignId })
      );
      container.appendChild(link);
    }
  },

  emitImpression({ apiBase, campaignId, brand, width, height }) {
    const impUrl = `${apiBase}/imp?cid=${campaignId}&crid=${width}x${height}&brand=${encodeURIComponent(
      brand
    )}&cb=${Date.now()}`;
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
