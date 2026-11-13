/* Բիզնեսի անհատական էջ */
(async function () {
  const { esc, icon, icons, card, stars, param, $, $$ } = UI;
  const id = param("id");
  const userP = UI.layout();
  const [b, user] = await Promise.all([API.getById(id).catch(() => null), userP]);

  if (!b) {
    $("#app").innerHTML = `<div class="container"><div class="center-box">
      ${UI.empty(t("biz.notFound"), t("biz.notFoundText"), `<a class="btn btn-primary" href="search.html">${t("nav.search")}</a>`)}</div></div>`;
    return icons();
  }
  document.title = `${b.name} — ${UI.catName(b.category)}, ${UI.cityName(b.city)} | Գտիր.am`;

  const isOwner = user && (user.id === b.owner_id || user.role === "admin");
  const digits = (p) => (p || "").replace(/\D/g, "");
  const waNumber = (p) => { let d = digits(p); if (d.startsWith("0")) d = "374" + d.slice(1); else if (d.length === 8) d = "374" + d; return d; };
  const url = (u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : "https://" + u);
  const social = (u, base) => (!u ? "" : /^https?:\/\//i.test(u) ? u : base + u.replace(/^@/, ""));
  const photos = b.photos || [];

  // Պատկերասրահ
  let gallery;
  if (!photos.length) gallery = `<div class="gallery one">${UI.cover(b)}</div>`;
  else {
    const shown = photos.slice(0, 3);
    const cls = shown.length === 1 ? "one" : shown.length === 2 ? "two" : "";
    gallery = `<div class="gallery ${cls}">${shown.map((p, i) => {
      const more = i === 2 && photos.length > 3 ? `class="more" data-more="+${photos.length - 3}"` : "";
      return `<div ${more} data-i="${i}" style="position:relative"><img src="${esc(p)}" alt="${esc(b.name)}" style="width:100%;height:100%;object-fit:cover"></div>`;
    }).join("")}</div>`;
  }

  const badges = [];
  if (UI.planActive(b) && b.plan === "premium") badges.push(`<span class="badge badge-premium">${icon("crown")}${t("card.premium")}</span>`);
  else if (UI.planActive(b) && b.plan === "pro") badges.push(`<span class="badge badge-pro">${icon("badge-check")}${t("card.pro")}</span>`);
  if (b.kind === "specialist") badges.push(`<span class="badge badge-spec">${icon("user")}${t("card.specialist")}</span>`);

  const statusNote = b.status === "pending" ? `<div class="alert alert-warn" style="margin-bottom:16px">${icon("clock")}${t("biz.pending")}</div>`
    : b.status === "rejected" ? `<div class="alert alert-danger" style="margin-bottom:16px">${icon("circle-x")}<div>${t("biz.rejected")}${b.reject_reason ? `<br><b>${t("acc.reason")}:</b> ${esc(b.reject_reason)}` : ""}</div></div>` : "";

  const contactRows = [
    b.phone && ["phone", t("form.phone"), `<a href="tel:${esc(digits(b.phone).replace(/^374/, "+374"))}">${esc(b.phone)}</a>`],
    b.address && ["map-pin", t("biz.address"), `${esc(b.address)}, ${esc(UI.cityName(b.city))}<br><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(b.address + ", " + UI.cityName(b.city) + ", Armenia")}">${t("biz.directions")}</a>`],
    !b.address && ["map-pin", t("search.city"), esc(UI.cityName(b.city))],
    b.hours && ["clock", t("biz.hours"), esc(b.hours)],
    b.price_info && ["wallet", t("biz.price"), esc(b.price_info)],
    b.website && ["globe", t("biz.website"), `<a target="_blank" rel="noopener nofollow" href="${esc(url(b.website))}">${esc(b.website.replace(/^https?:\/\//, ""))}</a>`],
    b.instagram && ["instagram", "Instagram", `<a target="_blank" rel="noopener nofollow" href="${esc(social(b.instagram, "https://instagram.com/"))}">${esc(b.instagram)}</a>`],
    b.facebook && ["facebook", "Facebook", `<a target="_blank" rel="noopener nofollow" href="${esc(social(b.facebook, "https://facebook.com/"))}">${esc(b.facebook)}</a>`],
    b.email && ["mail", t("form.email"), `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`],
  ].filter(Boolean);

  $("#app").innerHTML = `
    <div class="container" style="padding-top:22px">
      <div class="crumbs"><a href="index.html">${t("biz.home")}</a>${icon("chevron-right")}
        <a href="search.html?category=${b.category}">${esc(UI.catName(b.category))}</a>${icon("chevron-right")}
        <a href="search.html?category=${b.category}&city=${b.city}">${esc(UI.cityName(b.city))}</a></div>
      ${statusNote}
      <div class="biz-hero">
        <div>
          ${gallery}
          <div class="biz-title">
            <div class="badges" style="position:static">${badges.join("")}</div>
            <h1>${esc(b.name)}</h1>
            <div class="line">
              <span>${icon(UI.cat(b.category).icon)}${esc(UI.catName(b.category))}</span>
              <span>${icon("map-pin")}${esc(UI.cityName(b.city))}</span>
              ${b.rating_count ? `<span class="rating">${icon("star")}${Number(b.rating_avg).toFixed(1)} <span class="muted">(${b.rating_count} ${t("card.reviews")})</span></span>` : ""}
              <span>${icon("eye")}${UI.fmtNum(b.views)} ${t("biz.views")}</span>
            </div>
          </div>
          ${b.description ? `<div class="panel" style="margin-top:24px"><h2>${t("biz.about")}</h2><div class="desc">${esc(b.description)}</div></div>` : ""}
          <div class="panel" style="margin-top:20px" id="reviewsPanel"><h2>${t("biz.reviews")}</h2><div id="reviews">${t("common.loading")}</div></div>
        </div>
        <aside class="contact-card">
          <div class="panel">
            <h2>${t("biz.contacts")}</h2>
            <div style="display:grid;gap:10px;margin-bottom:16px">
              <a class="btn btn-primary btn-lg btn-block" href="tel:${esc(digits(b.phone).replace(/^374/, "+374"))}">${icon("phone")}${t("biz.call")}</a>
              ${b.whatsapp ? `<a class="btn btn-wa btn-lg btn-block" target="_blank" rel="noopener" href="https://wa.me/${waNumber(b.whatsapp)}">${icon("message-circle")}${t("biz.whatsapp")}</a>` : ""}
            </div>
            <div class="contact-list">${contactRows.map(([ic, label, val]) => `<div>${icon(ic)}<div><small>${label}</small>${val}</div></div>`).join("")}</div>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-outline" style="flex:1" id="shareBtn">${icon("share-2")}${t("biz.share")}</button>
            ${isOwner ? `<a class="btn btn-outline" style="flex:1" href="add.html?id=${encodeURIComponent(b.id)}">${icon("pencil")}${t("biz.edit")}</a>` : ""}
          </div>
        </aside>
      </div>
      <div id="similarWrap"></div>
    </div>`;
  icons();

  // Lightbox
  $$(".gallery [data-i]").forEach((el) => el.addEventListener("click", () => openLightbox(+el.dataset.i)));
  function openLightbox(i) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    const draw = () => (lb.innerHTML = `<img src="${esc(photos[i])}" alt=""><button aria-label="close">${icon("x")}</button>`, icons());
    draw();
    lb.addEventListener("click", (e) => {
      if (e.target.tagName === "IMG" && photos.length > 1) { i = (i + 1) % photos.length; draw(); }
      else lb.remove();
    });
    document.body.appendChild(lb);
  }

  $("#shareBtn").addEventListener("click", async () => {
    const data = { title: b.name, url: location.href };
    if (navigator.share) { try { await navigator.share(data); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(location.href); UI.toast(t("biz.copied")); } catch (e) { prompt("", location.href); }
  });

  // Դիտումների հաշվիչ (մեկ անգամ այցելության ընթացքում)
  if (b.status === "approved") {
    const key = "gtir_v_" + b.id;
    try { if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, "1"); API.incrementViews(b.id); } } catch (e) {}
  }

  // Կարծիքներ
  let rating = 0;
  async function loadReviews() {
    const list = await API.reviews(b.id).catch(() => []);
    const fresh = await API.getById(b.id).catch(() => b) || b;
    const head = fresh.rating_count
      ? `<div class="rating-big"><b>${Number(fresh.rating_avg).toFixed(1)}</b><div>${stars(fresh.rating_avg)}<div class="muted" style="font-size:13px">${fresh.rating_count} ${t("card.reviews")}</div></div></div>` : "";
    const items = list.length
      ? list.map((r) => `<div class="review"><div class="review-head"><span class="avatar">${esc((r.author_name || "?").charAt(0))}</span><b>${esc(r.author_name || "")}</b>${stars(r.rating)}<time>${UI.fmtDate(r.created_at)}</time></div>
          ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}
          ${user && (user.role === "admin" || user.id === r.user_id) ? `<div><button class="btn btn-ghost btn-sm" data-del="${r.id}">${icon("trash-2")}${t("common.delete")}</button></div>` : ""}</div>`).join("")
      : `<p class="muted">${t("biz.noReviews")}</p>`;

    let form = "";
    if (b.status !== "approved") form = "";
    else if (!user) form = `<div class="alert alert-info" style="margin-top:16px">${icon("info")}<a href="login.html?next=${encodeURIComponent("business.html?id=" + b.id)}"><b>${t("biz.loginToReview")}</b></a></div>`;
    else if (user.id === b.owner_id) form = "";
    else if (list.some((r) => r.user_id === user.id)) form = "";
    else form = `
      <form id="revForm" style="display:grid;gap:12px;margin-top:18px;padding-top:18px;border-top:1px solid var(--line)">
        <b>${t("biz.writeReview")}</b>
        <div class="field"><label>${t("biz.yourRating")}</label><div class="stars-input" id="starsIn">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n}">${icon("star")}</button>`).join("")}</div></div>
        <div class="field"><textarea class="textarea" name="comment" maxlength="1000" placeholder="${esc(t("biz.commentPh"))}" style="min-height:90px"></textarea></div>
        <div><button class="btn btn-primary" type="submit">${icon("send")}${t("biz.send")}</button></div>
      </form>`;

    $("#reviews").innerHTML = head + items + form;
    icons();
    rating = 0;
    $$("#starsIn button").forEach((btn) => btn.addEventListener("click", () => {
      rating = +btn.dataset.n;
      $$("#starsIn button").forEach((x) => x.classList.toggle("on", +x.dataset.n <= rating));
    }));
    const f = $("#revForm");
    if (f) f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!rating) return UI.toast(t("biz.yourRating"), "err");
      const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      try { await API.addReview(b.id, rating, f.comment.value.trim()); UI.toast(t("biz.reviewThanks")); loadReviews(); }
      catch (err) { UI.toast(err.message, "err"); btn.disabled = false; }
    });
    $$("[data-del]").forEach((btn) => btn.addEventListener("click", async () => {
      if (!(await UI.confirmBox(t("common.delete") + "?"))) return;
      try { await API.deleteReview(btn.dataset.del); loadReviews(); } catch (err) { UI.toast(err.message, "err"); }
    }));
  }
  loadReviews();

  // Նմանատիպ
  try {
    const { items } = await API.search({ category: b.category, limit: 5 });
    const sim = items.filter((x) => x.id !== b.id).slice(0, 4);
    if (sim.length) {
      $("#similarWrap").innerHTML = `<section class="section-tight"><div class="section-head"><div><h2>${t("biz.similar")}</h2></div>
        <a class="link-more" href="search.html?category=${b.category}">${t("home.seeAll")} ${icon("arrow-right")}</a></div>
        <div class="grid">${sim.map(card).join("")}</div></section>`;
      icons();
    }
  } catch (e) {}
})();
