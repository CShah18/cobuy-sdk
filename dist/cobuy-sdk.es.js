const d = {
  config: {
    apiBaseUrl: "",
    allowImpression: !0
  },
  init(e = {}) {
    this.config = { ...this.config, ...e }, this.loadAds();
  },
  async loadAds() {
    const e = document.querySelectorAll(".cobuy-ad");
    e.length && e.forEach(async (t) => {
      const o = t.dataset.campaign || "unknown", n = t.dataset.brand || "", a = t.dataset.width || "300", i = t.dataset.height || "250", s = t.dataset.apiBase || this.config.apiBaseUrl, r = t.dataset.clickTracker;
      if (!s) {
        console.error("[CoBuySDK] Missing apiBase in ad tag");
        return;
      }
      try {
        const c = await this.fetchCreative(s, o);
        if (!c || !c.url) {
          console.error("[CoBuySDK] No creative returned from API");
          return;
        }
        this.renderCreative(t, c.url, a, i, r), this.config.allowImpression && this.emitImpression({ apiBase: s, campaignId: o, brand: n, width: a, height: i });
      } catch (c) {
        console.error("[CoBuySDK] Error loading creative:", c);
      }
    });
  },
  async fetchCreative(e, t) {
    const o = `${e}/api/v1/creative?cid=${encodeURIComponent(
      t
    )}&cb=${Date.now()}`, n = await fetch(o);
    if (!n.ok) throw new Error(`Creative fetch failed: ${n.status}`);
    return n.json();
  },
  renderCreative(e, t, o, n, a) {
    e.innerHTML = "", e.style.position = "relative", e.style.display = "inline-block", e.style.width = `${o}px`, e.style.height = `${n}px`;
    const i = document.createElement("iframe");
    i.src = t, i.width = o, i.height = n, i.frameBorder = "0", i.scrolling = "no", i.style.border = "none", e.appendChild(i);
    const s = `${this.config.apiBaseUrl}/api/v1/tracking/click?src=cobuy&cid=${encodeURIComponent(
      e.dataset.campaign
    )}&crid=${encodeURIComponent(o + "x" + n)}&pub=web&plc=banner&dest=${encodeURIComponent(
      a || "https://google.com"
    )}&clid=${Date.now()}`, r = document.createElement("a");
    r.href = s, r.target = "_blank", r.rel = "noopener", Object.assign(r.style, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      textDecoration: "none"
    }), r.addEventListener(
      "click",
      () => this.emitEvent("click", { campaign_id: e.dataset.campaign })
    ), e.appendChild(r);
  },
  emitImpression({ apiBase: e, campaignId: t, brand: o, width: n, height: a }) {
    const i = `${e}/api/v1/tracking/imp?src=cobuy&cid=${encodeURIComponent(
      t
    )}&crid=${encodeURIComponent(n + "x" + a)}&pub=web&plc=banner&cb=${Date.now()}`, s = new Image(1, 1);
    s.src = i, s.style = "position:absolute;left:-9999px;top:-9999px;", document.body.appendChild(s), console.log("[CoBuySDK] Impression fired:", i);
  },
  emitEvent(e, t = {}) {
    const o = `${this.config.apiBaseUrl}/events`, n = {
      event_type: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...t
    };
    fetch(o, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    }).catch((a) => console.error("[CoBuySDK] Event error:", a.message));
  },
  createShareLinks(e, t = {}) {
    const o = this.addUTMParams(e, t), n = encodeURIComponent(o);
    return {
      whatsapp: `https://wa.me/?text=${n}`,
      sms: `sms:?body=${n}`,
      copy: o
    };
  },
  addUTMParams(e, t = {}) {
    const o = new URLSearchParams(t).toString();
    if (!o) return e;
    const n = e.includes("?") ? "&" : "?";
    return `${e}${n}${o}`;
  }
};
typeof window < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => d.init()) : d.init(), window.CoBuySDK = d);
export {
  d as default
};
