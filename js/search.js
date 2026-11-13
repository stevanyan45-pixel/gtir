/* Որոնում և ֆիլտրեր */
(async function () {
  const { esc, icon, icons, card, skeletons, empty, cityOptions, catOptions, param, $, $$ } = UI;
  const state = {
    q: param("q"), city: param("city"), category: param("category"),
    kind: param("kind"), sort: param("sort") || "relevant", offset: 0,
  };
  const PAGE = 12;

  const title = state.category ? UI.catName(state.category) : state.kind === "specialist" ? t("nav.specialists") : t("search.title");
  document.title = title + " — Գտիր.am";

  $("#app").innerHTML = `
    <div class="container">
      <div class="page-head">
        <div class="crumbs"><a href="index.html">${t("biz.home")}</a>${icon("chevron-right")}<span>${esc(title)}</span></div>
        <h1 id="pageTitle">${esc(title)}</h1>
      </div>
      <form class="search-bar" id="sForm" style="margin-top:18px">
        <label class="hs-field hs-q" style="flex:1">${icon("search")}<input name="q" value="${esc(state.q)}" placeholder="${esc(t("hero.placeholder"))}" autocomplete="off"></label>
        <button type="button" class="btn btn-outline filter-toggle" id="fToggle">${icon("sliders-horizontal")}${t("search.filters")}</button>
        <button class="btn btn-primary" type="submit">${t("hero.button")}</button>
      </form>
      <div class="search-layout">
        <aside class="filters" id="filters">
          <h3>${icon("sliders-horizontal")}${t("search.filters")}</h3>
          <div class="field"><label>${t("search.type")}</label>
            <div class="chips" id="kindChips">
              ${[["", t("search.allTypes")], ["company", t("kind.company")], ["specialist", t("kind.specialist")]]
                .map(([v, l]) => `<button type="button" class="chip ${state.kind === v ? "on" : ""}" data-kind="${v}">${esc(l)}</button>`).join("")}
            </div></div>
          <div class="field"><label>${t("search.category")}</label><select class="select" id="fCat">${catOptions(state.category, t("search.allCategories"))}</select></div>
          <div class="field"><label>${t("search.city")}</label><select class="select" id="fCity">${cityOptions(state.city, t("hero.allCities"))}</select></div>
          <button type="button" class="btn btn-outline" id="fReset">${icon("rotate-ccw")}${t("search.reset")}</button>
        </aside>
        <section>
          <div class="results-head">
            <b id="resCount">${t("common.loading")}</b>
            <label style="display:flex;align-items:center;gap:8px;font-size:14px" class="muted">${t("search.sort")}
              <select class="select" id="fSort" style="height:40px;width:auto">
                ${["relevant", "new", "popular", "rating"].map((s) => `<option value="${s}" ${state.sort === s ? "selected" : ""}>${t("sort." + s)}</option>`).join("")}
              </select></label>
          </div>
          <div id="results"></div>
          <div style="text-align:center;margin-top:24px"><button class="btn btn-outline hidden" id="more">${t("search.loadMore")}</button></div>
        </section>
      </div>
    </div>
    <div id="footerSpacer"></div>`;

  UI.layout(state.kind === "specialist" ? "specialists" : "search");

  function syncUrl() {
    const p = new URLSearchParams();
    ["q", "city", "category", "kind"].forEach((k) => state[k] && p.set(k, state[k]));
    if (state.sort !== "relevant") p.set("sort", state.sort);
    history.replaceState(null, "", "search.html" + (p.toString() ? "?" + p : ""));
  }

  async function run(append) {
    if (!append) { state.offset = 0; $("#results").innerHTML = `<div class="grid grid-3">${skeletons(6)}</div>`; }
    const more = $("#more");
    more.disabled = true;
    try {
      const { items, total } = await API.search({ ...state, limit: PAGE });
      $("#resCount").textContent = t("search.results", { n: total });
      if (!append) {
        $("#results").innerHTML = items.length
          ? `<div class="grid grid-3" id="resGrid"></div>`
          : empty(t("search.none"), t("search.noneText"), `<a class="btn btn-primary" href="search.html">${t("search.reset")}</a>`);
      }
      const g = $("#resGrid");
      if (g) g.insertAdjacentHTML("beforeend", items.map(card).join(""));
      state.offset += items.length;
      more.classList.toggle("hidden", state.offset >= total);
    } catch (e) {
      console.error(e);
      $("#results").innerHTML = empty(t("common.error"));
    }
    more.disabled = false;
    icons();
  }

  const update = () => { syncUrl(); run(false); };
  $("#sForm").addEventListener("submit", (e) => { e.preventDefault(); state.q = e.target.q.value.trim(); update(); });
  $("#fCat").addEventListener("change", (e) => { state.category = e.target.value; update(); });
  $("#fCity").addEventListener("change", (e) => { state.city = e.target.value; update(); });
  $("#fSort").addEventListener("change", (e) => { state.sort = e.target.value; update(); });
  $$("#kindChips .chip").forEach((b) => b.addEventListener("click", () => {
    state.kind = b.dataset.kind;
    $$("#kindChips .chip").forEach((x) => x.classList.toggle("on", x === b));
    update();
  }));
  $("#fReset").addEventListener("click", () => {
    Object.assign(state, { q: "", city: "", category: "", kind: "", sort: "relevant" });
    $("#sForm").q.value = ""; $("#fCat").value = ""; $("#fCity").value = ""; $("#fSort").value = "relevant";
    $$("#kindChips .chip").forEach((x) => x.classList.toggle("on", x.dataset.kind === ""));
    update();
  });
  $("#fToggle").addEventListener("click", () => $("#filters").classList.toggle("open"));
  $("#more").addEventListener("click", () => run(true));

  run(false);
})();
