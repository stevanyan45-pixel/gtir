/* =====================================================================
   Ընդհանուր UI. header, footer, քարտեր, toast, modal, նկարների սեղմում
   ===================================================================== */
(function () {
  const CFG = window.GTIR_CONFIG, DATA = window.GTIR_DATA;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const param = (k) => new URLSearchParams(location.search).get(k) || "";
  const city = (id) => DATA.cities.find((c) => c.id === id);
  const cat = (id) => DATA.categories.find((c) => c.id === id) || { id, icon: "briefcase", color: "#6b7393", hy: id, ru: id, en: id };
  const cityName = (id) => I18N.name(city(id)) || id || "";
  const catName = (id) => I18N.name(cat(id));
  const icon = (name, cls = "") => `<i data-lucide="${name}" class="${cls}"></i>`;
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.6 15.6 20.5 20.5"/><circle cx="10.5" cy="10.5" r="2.1" fill="currentColor" stroke="none"/></svg>`;
  const logo = () => `<a class="logo" href="index.html"><span class="logo-mark">${LOGO_SVG}</span><span>Գտիր<b>.am</b></span></a>`;

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (I18N.lang === "hy") {
      const m = ["հունվ.", "փետր.", "մարտ", "ապր.", "մայիս", "հունիս", "հուլիս", "օգոստ.", "սեպտ.", "հոկտ.", "նոյեմ.", "դեկտ."];
      return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
    }
    const loc = { hy: "hy-AM", ru: "ru-RU", en: "en-GB" }[I18N.lang];
    try { return d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  const fmtNum = (n) => Number(n || 0).toLocaleString("en-US").replace(/,/g, " ");
  const isNew = (b) => Date.now() - new Date(b.created_at).getTime() < 7 * 864e5;
  const planActive = (b) => b.plan !== "free" && (!b.featured_until || new Date(b.featured_until) > new Date());

  function cover(b, extra = "") {
    if (b.photos && b.photos.length) return `<img src="${esc(b.photos[0])}" alt="${esc(b.name)}" loading="lazy" ${extra}>`;
    const c = cat(b.category);
    return `<div class="cover-ph" style="background:linear-gradient(135deg, ${c.color} 0%, #1b2160 135%)">${icon(c.icon)}</div>`;
  }

  function stars(n, size) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<i data-lucide="star" class="${i <= Math.round(n) ? "on" : ""}"></i>`;
    return `<span class="stars" ${size ? `style="--s:${size}px"` : ""}>${s}</span>`;
  }

  function card(b) {
    const badges = [];
    if (planActive(b) && b.plan === "premium") badges.push(`<span class="badge badge-premium">${icon("crown")}${t("card.premium")}</span>`);
    else if (planActive(b) && b.plan === "pro") badges.push(`<span class="badge badge-pro">${icon("badge-check")}${t("card.pro")}</span>`);
    if (b.kind === "specialist") badges.push(`<span class="badge badge-spec">${icon("user")}${t("card.specialist")}</span>`);
    if (isNew(b) && !badges.length) badges.push(`<span class="badge badge-new">${t("card.new")}</span>`);
    return `
      <a class="biz-card ${planActive(b) && b.plan === "premium" ? "is-premium" : ""}" href="business.html?id=${encodeURIComponent(b.id)}">
        <div class="cover"><div class="badges">${badges.join("")}</div>${cover(b)}</div>
        <div class="biz-body">
          <div class="biz-cat">${esc(catName(b.category))}</div>
          <div class="biz-name">${esc(b.name)}</div>
          <div class="biz-meta">
            <span>${icon("map-pin")}${esc(cityName(b.city))}</span>
            ${b.rating_count ? `<span class="rating">${icon("star")}${Number(b.rating_avg).toFixed(1)} <span class="muted">(${b.rating_count})</span></span>` : ""}
            <span>${icon("eye")}${fmtNum(b.views)}</span>
          </div>
        </div>
      </a>`;
  }

  const skeletons = (n) => Array.from({ length: n }, () => `<div class="skel skel-card"></div>`).join("");
  const empty = (title, text = "", action = "") =>
    `<div class="empty"><div class="ico">${icon("search-x")}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${action}</div>`;

  function cityOptions(sel, allLabel) {
    return (allLabel !== undefined ? `<option value="">${esc(allLabel)}</option>` : "") +
      DATA.cities.map((c) => `<option value="${c.id}" ${c.id === sel ? "selected" : ""}>${esc(I18N.name(c))}</option>`).join("");
  }
  function catOptions(sel, allLabel) {
    return (allLabel !== undefined ? `<option value="">${esc(allLabel)}</option>` : "") +
      DATA.categories.map((c) => `<option value="${c.id}" ${c.id === sel ? "selected" : ""}>${esc(I18N.name(c))}</option>`).join("");
  }

  /* ---------- Toast & Modal ---------- */
  function toast(msg, type = "ok") {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML = `${icon(type === "err" ? "circle-alert" : "circle-check")}<span>${esc(msg)}</span>`;
    box.appendChild(el); icons();
    setTimeout(() => el.remove(), 3800);
  }
  function modal({ title, body, okText, cancelText, danger, onOk }) {
    return new Promise((resolve) => {
      const bg = document.createElement("div");
      bg.className = "modal-bg";
      bg.innerHTML = `<div class="modal" role="dialog"><h3>${esc(title)}</h3><div class="modal-body">${body || ""}</div>
        <div class="modal-actions"><button class="btn btn-outline" data-x>${esc(cancelText || t("common.cancel"))}</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${esc(okText || t("common.save"))}</button></div></div>`;
      document.body.appendChild(bg); icons();
      const close = (v) => { bg.remove(); resolve(v); };
      bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-x]")) close(false); });
      $("[data-ok]", bg).addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        if (onOk) {
          btn.disabled = true;
          try { const r = await onOk(bg); if (r === false) { btn.disabled = false; return; } close(r === undefined ? true : r); }
          catch (err) { btn.disabled = false; toast(err.message, "err"); }
        } else close(true);
      });
      const f = $("input,textarea,select", bg); if (f) f.focus();
    });
  }
  const confirmBox = (title, okText) => modal({ title, okText: okText || t("common.delete"), danger: true });

  /* ---------- Նկարների սեղմում (փոքրացնում ենք մինչև վերբեռնելը) ---------- */
  function compressImage(file, maxSide, quality) {
    maxSide = maxSide || (API.mode === "demo" ? 900 : 1600);
    quality = quality || (API.mode === "demo" ? 0.7 : 0.82);
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error("Ընտրիր նկար (JPG, PNG, WEBP)"));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        let { width: w, height: h } = img;
        const k = Math.min(1, maxSide / Math.max(w, h));
        w = Math.round(w * k); h = Math.round(h * k);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error(t("common.error")))), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Նկարը չհաջողվեց բացել")); };
      img.src = url;
    });
  }

  /* ---------- Header / Footer ---------- */
  async function layout(active) {
    const user = await API.getUser().catch(() => null);
    const navItems = [
      ["search", "search.html", "nav.search", "search"],
      ["specialists", "search.html?kind=specialist", "nav.specialists", "users"],
      ["pricing", "pricing.html", "nav.pricing", "gem"],
    ];
    const nav = navItems.map(([k, href, key]) => `<a href="${href}" class="${active === k ? "active" : ""}">${t(key)}</a>`).join("");
    const langs = I18N.langs.map((l) => `<button data-lang="${l.id}" class="${I18N.lang === l.id ? "on" : ""}">${l.label}</button>`).join("");
    const initial = user ? esc((user.full_name || user.email || "?").trim().charAt(0).toUpperCase()) : "";
    const userBlock = user
      ? `<div class="user-menu"><button class="user-btn" id="userBtn"><span class="avatar">${initial}</span><span class="hide-m">${esc((user.full_name || user.email).split(" ")[0])}</span>${icon("chevron-down")}</button>
          <div class="dropdown" id="userDrop">
            <a href="account.html">${icon("layout-dashboard")}${t("nav.account")}</a>
            <a href="add.html">${icon("plus")}${t("nav.addShort")}</a>
            ${user.role === "admin" ? `<a href="admin.html">${icon("shield-check")}${t("nav.admin")}</a>` : ""}
            <div class="sep"></div>
            <button id="logoutBtn">${icon("log-out")}${t("nav.logout")}</button>
          </div></div>`
      : `<a class="btn btn-ghost hide-m" href="login.html">${icon("log-in")}${t("nav.login")}</a>`;

    const header = document.getElementById("header");
    if (header) {
      header.outerHTML = `
        ${API.mode === "demo" ? `<div class="demo-banner">${t("common.demoBanner")}</div>` : ""}
        <header class="site-header">
          <div class="container header-row">
            ${logo()}
            <nav class="nav">${nav}</nav>
            <div class="header-actions">
              <div class="lang-switch">${langs}</div>
              <a class="btn btn-accent btn-sm hide-m" href="add.html">${icon("plus")}${t("nav.add")}</a>
              ${userBlock}
              <button class="burger" id="burger" aria-label="Մենյու">${icon("menu")}</button>
            </div>
          </div>
          <div class="mobile-nav" id="mobileNav">
            <a href="search.html">${icon("search")}${t("nav.search")}</a>
            <a href="search.html?kind=specialist">${icon("users")}${t("nav.specialists")}</a>
            <a href="pricing.html">${icon("gem")}${t("nav.pricing")}</a>
            <a href="add.html">${icon("plus")}${t("nav.add")}</a>
            ${user ? `<a href="account.html">${icon("layout-dashboard")}${t("nav.account")}</a>` : `<a href="login.html">${icon("log-in")}${t("nav.login")}</a>`}
            ${user && user.role === "admin" ? `<a href="admin.html">${icon("shield-check")}${t("nav.admin")}</a>` : ""}
            <div class="lang-switch" style="width:fit-content;margin-top:8px">${langs}</div>
          </div>
        </header>`;
    }

    const footer = document.getElementById("footer");
    if (footer) {
      const topCats = DATA.categories.slice(0, 5).map((c) => `<li><a href="search.html?category=${c.id}">${esc(I18N.name(c))}</a></li>`).join("");
      footer.outerHTML = `
        <footer class="site-footer">
          <div class="container">
            <div class="footer-grid">
              <div>${logo()}<p class="footer-about">${t("footer.about")}</p>
                <div class="socials">
                  <a href="${esc(CFG.INSTAGRAM)}" target="_blank" rel="noopener" aria-label="Instagram">${icon("instagram")}</a>
                  <a href="${esc(CFG.FACEBOOK)}" target="_blank" rel="noopener" aria-label="Facebook">${icon("facebook")}</a>
                  <a href="${esc(CFG.TELEGRAM)}" target="_blank" rel="noopener" aria-label="Telegram">${icon("send")}</a>
                </div></div>
              <div><h4>${t("footer.links")}</h4><ul>${topCats}</ul></div>
              <div><h4>${t("footer.business")}</h4><ul>
                <li><a href="add.html">${t("nav.add")}</a></li>
                <li><a href="pricing.html">${t("nav.pricing")}</a></li>
                <li><a href="search.html?kind=specialist">${t("nav.specialists")}</a></li>
                <li><a href="account.html">${t("nav.account")}</a></li></ul></div>
              <div><h4>${t("footer.contact")}</h4><ul>
                <li>${icon("phone")}<a href="tel:${esc(CFG.CONTACT_PHONE.replace(/\s/g, ""))}">${esc(CFG.CONTACT_PHONE)}</a></li>
                <li>${icon("mail")}<a href="mailto:${esc(CFG.CONTACT_EMAIL)}">${esc(CFG.CONTACT_EMAIL)}</a></li>
                <li>${icon("map-pin")}${esc(CFG.CONTACT_ADDRESS)}</li></ul></div>
            </div>
            <div class="footer-bottom"><span>© ${new Date().getFullYear()} Գտիր.am — ${t("footer.rights")}</span><span>Made in Armenia 🇦🇲</span></div>
          </div>
        </footer>`;
    }

    $$("[data-lang]").forEach((b) => b.addEventListener("click", () => I18N.setLang(b.dataset.lang)));
    const burger = $("#burger");
    if (burger) burger.addEventListener("click", () => $("#mobileNav").classList.toggle("open"));
    const ub = $("#userBtn");
    if (ub) {
      ub.addEventListener("click", (e) => { e.stopPropagation(); $("#userDrop").classList.toggle("open"); });
      document.addEventListener("click", () => { const d = $("#userDrop"); if (d) d.classList.remove("open"); });
    }
    const lo = $("#logoutBtn");
    if (lo) lo.addEventListener("click", async () => { await API.signOut(); location.href = "index.html"; });
    icons();
    return user;
  }

  async function requireUser() {
    const u = await API.getUser().catch(() => null);
    if (!u) { location.replace("login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search)); return null; }
    return u;
  }

  window.UI = {
    esc, $, $$, param, city, cat, cityName, catName, icon, icons, logo, fmtDate, fmtNum, isNew, planActive,
    cover, stars, card, skeletons, empty, cityOptions, catOptions, toast, modal, confirmBox, compressImage, layout, requireUser,
  };
})();
