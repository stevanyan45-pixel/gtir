/* Գլխավոր էջ */
(async function () {
  const { esc, icon, icons, card, skeletons, empty, cityOptions, $ } = UI;
  const DATA = window.GTIR_DATA;

  const section = (id, title, sub, link, extraClass = "") => `
    <section class="section ${extraClass}">
      <div class="container">
        <div class="section-head">
          <div><h2>${title}</h2><p>${sub}</p></div>
          ${link ? `<a class="link-more" href="${link}">${t("home.seeAll")} ${icon("arrow-right")}</a>` : ""}
        </div>
        <div id="${id}"></div>
      </div>
    </section>`;

  $("#app").innerHTML = `
    <section class="hero">
      <div class="container">
        <span class="hero-badge"><i></i>${t("hero.badge")}</span>
        <h1>${t("hero.title")}</h1>
        <p class="lead">${t("hero.subtitle")}</p>
        <form class="hero-search" id="heroForm" action="search.html">
          <label class="hs-field hs-q">${icon("search")}<input name="q" placeholder="${esc(t("hero.placeholder"))}" autocomplete="off"></label>
          <label class="hs-field hs-city">${icon("map-pin")}<select name="city">${cityOptions("", t("hero.allCities"))}</select></label>
          <button class="btn btn-accent" type="submit">${t("hero.button")}</button>
        </form>
        <div class="hero-tags"><span>${t("hero.popular")}</span>
          ${DATA.popularSearches.map((s) => `<a href="search.html?q=${encodeURIComponent(s)}">${esc(s)}</a>`).join("")}
        </div>
        <div class="hero-stats">
          <div><b id="statCount">—</b><span>${t("stats.listings")}</span></div>
          <div><b>${DATA.cities.length - 1}</b><span>${t("stats.cities")}</span></div>
          <div><b>${DATA.categories.length}</b><span>${t("stats.categories")}</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head"><div><h2>${t("home.categories")}</h2><p>${t("home.categoriesSub")}</p></div></div>
        <div class="cat-grid">
          ${DATA.categories.map((c) => `
            <a class="cat" href="search.html?category=${c.id}">
              <span class="cat-ico" style="background:${c.color}1a;color:${c.color}">${icon(c.icon)}</span>
              <b>${esc(I18N.name(c))}</b>
            </a>`).join("")}
        </div>
      </div>
    </section>

    ${section("popular", t("home.popular"), t("home.popularSub"), "search.html?sort=popular", "bg-white")}
    ${section("latest", t("home.latest"), t("home.latestSub"), "search.html?sort=new")}
    ${section("specialists", t("home.specialists"), t("home.specialistsSub"), "search.html?kind=specialist", "bg-white")}

    <section class="section">
      <div class="container">
        <div class="section-head"><div><h2>${t("how.title")}</h2></div></div>
        <div class="steps">
          ${[["search", 1], ["scale", 2], ["phone-call", 3]].map(([ic, n]) => `
            <div class="step"><div class="step-n">${icon(ic)}</div><h3>${n}. ${t(`how.s${n}t`)}</h3><p>${t(`how.s${n}d`)}</p></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="cta">
          <div><h2>${t("home.ctaTitle")}</h2><p>${t("home.ctaText")}</p></div>
          <div class="cta-actions">
            <a class="btn btn-accent btn-lg" href="add.html">${icon("plus")}${t("home.ctaButton")}</a>
            <a class="btn btn-outline btn-lg" href="pricing.html">${t("home.ctaPricing")}</a>
          </div>
        </div>
      </div>
    </section>`;

  UI.layout("home");

  const grid = (id, items, cls = "grid") => {
    $("#" + id).innerHTML = items.length
      ? `<div class="${cls}">${items.map(card).join("")}</div>`
      : empty(t("home.empty"), "", `<a class="btn btn-primary" href="add.html">${t("nav.add")}</a>`);
  };
  ["popular", "latest", "specialists"].forEach((id) => ($("#" + id).innerHTML = `<div class="grid">${skeletons(4)}</div>`));

  try {
    const [popular, latest, specs, count] = await Promise.all([
      API.popular(8), API.latest(8), API.latest(4, "specialist"), API.count(),
    ]);
    grid("popular", popular);
    grid("latest", latest);
    grid("specialists", specs);
    $("#statCount").textContent = UI.fmtNum(count);
  } catch (e) {
    console.error(e);
    UI.toast(t("common.error"), "err");
  }
  icons();
})();
