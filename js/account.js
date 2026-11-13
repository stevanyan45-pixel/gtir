/* Իմ էջը — իմ հայտարարությունները և պրոֆիլը */
(async function () {
  const { esc, icon, icons, $, $$ } = UI;
  UI.layout("account");
  const user = await UI.requireUser();
  if (!user) return;

  $("#app").innerHTML = `
    <div class="container" style="max-width:960px;padding-bottom:50px">
      <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">
        <div><h1>${t("acc.hello")}, ${esc((user.full_name || user.email).split(" ")[0])} 👋</h1>
          <p>${esc(user.email)}${user.role === "admin" ? ` · <a href="admin.html" style="color:var(--brand);font-weight:600">${t("nav.admin")}</a>` : ""}</p></div>
        <a class="btn btn-accent" href="add.html">${icon("plus")}${t("nav.add")}</a>
      </div>

      <h2 style="font-size:20px;margin:28px 0 14px">${t("acc.myListings")}</h2>
      <div id="mine">${UI.skeletons(1).replace("skel-card", "skel-card\" style=\"height:100px")}</div>

      <h2 style="font-size:20px;margin:40px 0 14px">${t("acc.title")}</h2>
      <form class="form-card" id="profForm" style="display:grid;gap:16px">
        <div class="row-2">
          <div class="field"><label>${t("auth.name")}</label><input class="input" name="full_name" maxlength="80" value="${esc(user.full_name)}"></div>
          <div class="field"><label>${t("form.phone")}</label><input class="input" name="phone" type="tel" maxlength="30" value="${esc(user.phone)}"></div>
        </div>
        <div><button class="btn btn-primary" type="submit">${icon("save")}${t("common.save")}</button></div>
      </form>
    </div>`;
  icons();

  async function load() {
    const list = await API.mine().catch(() => []);
    if (!list.length) {
      $("#mine").innerHTML = UI.empty(t("acc.empty"), "", `<a class="btn btn-primary" href="add.html">${icon("plus")}${t("acc.addFirst")}</a>`);
      return icons();
    }
    $("#mine").innerHTML = list.map((b) => `
      <div class="list-item">
        <a class="list-thumb" href="business.html?id=${encodeURIComponent(b.id)}">${UI.cover(b)}</a>
        <div class="list-info">
          <b>${esc(b.name)}</b>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="status status-${b.status}">${t("status." + b.status)}</span>
            <span class="plan-tag ${b.plan}">${t("plan." + b.plan)}</span>
            <span class="muted">${esc(UI.catName(b.category))} · ${esc(UI.cityName(b.city))} · ${icon("eye")} ${UI.fmtNum(b.views)}</span>
          </div>
          ${b.status === "rejected" && b.reject_reason ? `<span class="muted" style="color:var(--danger)">${t("acc.reason")}: ${esc(b.reject_reason)}</span>` : ""}
          ${b.plan !== "free" && b.featured_until ? `<span class="muted">${t("admin.until")}: ${UI.fmtDate(b.featured_until)}</span>` : ""}
        </div>
        <div class="list-actions">
          <a class="btn btn-outline btn-sm" href="business.html?id=${encodeURIComponent(b.id)}">${icon("eye")}${t("acc.view")}</a>
          <a class="btn btn-outline btn-sm" href="add.html?id=${encodeURIComponent(b.id)}">${icon("pencil")}${t("acc.edit")}</a>
          ${b.status === "approved" && b.plan === "free" ? `<a class="btn btn-accent btn-sm" href="pricing.html?biz=${encodeURIComponent(b.id)}">${icon("rocket")}${t("acc.upgrade")}</a>` : ""}
          <button class="btn btn-danger btn-sm" data-del="${b.id}">${icon("trash-2")}</button>
        </div>
      </div>`).join("");
    icons();
    $$("[data-del]").forEach((btn) => btn.addEventListener("click", async () => {
      if (!(await UI.confirmBox(t("acc.confirmDelete")))) return;
      try { await API.remove(btn.dataset.del); UI.toast(t("admin.saved")); load(); }
      catch (e) { UI.toast(e.message, "err"); }
    }));
  }
  load();

  $("#profForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await API.updateProfile({ full_name: e.target.full_name.value.trim(), phone: e.target.phone.value.trim() });
      UI.toast(t("admin.saved"));
    } catch (err) { UI.toast(err.message, "err"); }
  });
})();
