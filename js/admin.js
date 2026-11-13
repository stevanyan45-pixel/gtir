/* Ադմինիստրատորի վահանակ */
(async function () {
  const { esc, icon, icons, $, $$ } = UI;
  UI.layout("admin");
  const user = await UI.requireUser();
  if (!user) return;
  if (user.role !== "admin") {
    $("#app").innerHTML = `<div class="container"><div class="center-box">${UI.empty(t("admin.noAccess"))}</div></div>`;
    return icons();
  }

  await API.admin.expirePlans().catch(() => {});
  let tab = location.hash.slice(1) || "pending";
  let users = [];
  const userEmail = (id) => (users.find((u) => u.id === id) || {}).email || "—";

  $("#app").innerHTML = `
    <div class="container">
      <div class="page-head"><h1>${t("admin.title")}</h1></div>
      <div class="admin-layout">
        <nav class="side-nav" id="sideNav">
          <button data-tab="pending">${icon("clock")}${t("admin.pending")}<span class="cnt hidden" id="cPending"></span></button>
          <button data-tab="all">${icon("list")}${t("admin.all")}</button>
          <button data-tab="requests">${icon("gem")}${t("admin.requests")}<span class="cnt hidden" id="cReq"></span></button>
          <button data-tab="users">${icon("users")}${t("admin.users")}</button>
        </nav>
        <section>
          <div class="stats-row" id="stats"></div>
          <div id="pane"></div>
        </section>
      </div>
    </div>`;

  async function loadStats() {
    const s = await API.admin.stats();
    $("#stats").innerHTML = [
      ["statTotal", s.total], ["statPending", s.pending], ["statApproved", s.approved], ["statUsers", s.users], ["statViews", s.views],
    ].map(([k, n]) => `<div class="stat"><span>${t("admin." + k)}</span><b>${UI.fmtNum(n)}</b></div>`).join("");
    const cp = $("#cPending"); cp.textContent = s.pending; cp.classList.toggle("hidden", !s.pending);
    const reqs = await API.admin.requests().catch(() => []);
    const n = reqs.filter((r) => r.status === "new").length;
    const cr = $("#cReq"); cr.textContent = n; cr.classList.toggle("hidden", !n);
  }

  function bizCard(b, full) {
    const until = b.featured_until ? b.featured_until.slice(0, 10) : "";
    return `
      <div class="admin-card" data-id="${b.id}">
        <div class="top">
          <a class="list-thumb" style="width:80px;height:64px" href="business.html?id=${encodeURIComponent(b.id)}" target="_blank">${UI.cover(b)}</a>
          <div style="display:grid;gap:4px;min-width:0">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <b>${esc(b.name)}</b><span class="status status-${b.status}">${t("status." + b.status)}</span>
              <span class="plan-tag ${b.plan}">${t("plan." + b.plan)}</span>
            </div>
            <span class="muted" style="font-size:13px">${esc(UI.catName(b.category))} · ${esc(UI.cityName(b.city))} · ${esc(b.phone)} · ${b.kind === "specialist" ? t("kind.specialist") : t("kind.company")}</span>
            <span class="muted" style="font-size:13px">${t("admin.owner")}: ${esc(userEmail(b.owner_id))} · ${UI.fmtDate(b.created_at)} · ${icon("eye")} ${b.views} · ${icon("image")} ${(b.photos || []).length}</span>
          </div>
        </div>
        ${b.description ? `<div class="desc">${esc(b.description)}</div>` : ""}
        ${b.status === "rejected" && b.reject_reason ? `<div class="alert alert-danger">${t("acc.reason")}: ${esc(b.reject_reason)}</div>` : ""}
        <div class="bar">
          ${b.status !== "approved" ? `<button class="btn btn-ok btn-sm" data-act="approve">${icon("check")}${t("admin.approve")}</button>` : ""}
          ${b.status !== "rejected" ? `<button class="btn btn-outline btn-sm" data-act="reject">${icon("x")}${t("admin.reject")}</button>` : ""}
          <a class="btn btn-ghost btn-sm" href="business.html?id=${encodeURIComponent(b.id)}" target="_blank">${icon("external-link")}${t("acc.view")}</a>
          <a class="btn btn-ghost btn-sm" href="add.html?id=${encodeURIComponent(b.id)}">${icon("pencil")}${t("acc.edit")}</a>
          ${full ? `
            <span style="flex:1"></span>
            <select class="select" data-plan>${["free", "pro", "premium"].map((p) => `<option value="${p}" ${b.plan === p ? "selected" : ""}>${t("plan." + p)}</option>`).join("")}</select>
            <input class="input" type="date" data-until value="${until}" title="${t("admin.until")}">
            <button class="btn btn-outline btn-sm" data-act="plan">${t("admin.applyPlan")}</button>
            <button class="btn btn-danger btn-sm" data-act="delete" aria-label="delete">${icon("trash-2")}</button>` : ""}
        </div>
      </div>`;
  }

  function bindCards(reload) {
    $$(".admin-card[data-id]").forEach((el) => {
      const id = el.dataset.id;
      el.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", async () => {
        const act = btn.dataset.act;
        try {
          if (act === "approve") await API.admin.setStatus(id, "approved");
          if (act === "reject") {
            const ok = await UI.modal({
              title: t("admin.reject"), okText: t("admin.reject"), danger: true,
              body: `<div class="field"><label>${t("admin.rejectReason")}</label><textarea class="textarea" id="rr" style="min-height:90px"></textarea></div>`,
              onOk: (m) => API.admin.setStatus(id, "rejected", m.querySelector("#rr").value.trim()),
            });
            if (!ok) return;
          }
          if (act === "plan") {
            const plan = el.querySelector("[data-plan]").value;
            let until = el.querySelector("[data-until]").value;
            if (plan !== "free" && !until) until = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
            await API.admin.setPlan(id, plan, until ? new Date(until + "T23:59:59").toISOString() : null);
          }
          if (act === "delete") {
            if (!(await UI.confirmBox(t("acc.confirmDelete")))) return;
            await API.remove(id);
          }
          UI.toast(t("admin.saved"));
          reload(); loadStats();
        } catch (e) { UI.toast(e.message, "err"); }
      }));
    });
  }

  const panes = {
    async pending() {
      const list = await API.admin.list({ status: "pending" });
      $("#pane").innerHTML = `<h2 style="font-size:20px;margin-bottom:14px">${t("admin.pending")}</h2>` +
        (list.length ? list.map((b) => bizCard(b, false)).join("") : UI.empty(t("admin.empty")));
      bindCards(panes.pending);
    },
    async all() {
      const q = ($("#aq") || {}).value || "", st = ($("#ast") || {}).value || "";
      if (!$("#aq")) {
        $("#pane").innerHTML = `<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
            <input class="input" id="aq" placeholder="${esc(t("admin.filter"))}" style="flex:1;min-width:200px">
            <select class="select" id="ast" style="width:auto"><option value="">${t("common.all")}</option>
              ${["pending", "approved", "rejected"].map((s) => `<option value="${s}">${t("status." + s)}</option>`).join("")}</select>
          </div><div id="allList"></div>`;
        let timer;
        $("#aq").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(panes.all, 300); });
        $("#ast").addEventListener("change", panes.all);
      }
      const list = await API.admin.list({ status: st, q: q.trim() });
      $("#allList").innerHTML = list.length ? list.map((b) => bizCard(b, true)).join("") : UI.empty(t("admin.empty"));
      bindCards(panes.all);
    },
    async requests() {
      const list = await API.admin.requests();
      $("#pane").innerHTML = `<h2 style="font-size:20px;margin-bottom:14px">${t("admin.requests")}</h2>` + (list.length ? `
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>${t("form.name")}</th><th>${t("admin.setPlan")}</th><th>${t("pricing.months")}</th><th>${t("pricing.contact")}</th><th></th><th></th></tr></thead><tbody>
          ${list.map((r) => `<tr>
            <td><a href="business.html?id=${encodeURIComponent(r.business_id)}" target="_blank"><b>${esc((r.businesses && r.businesses.name) || "—")}</b></a><br><span class="muted" style="font-size:12.5px">${UI.fmtDate(r.created_at)}</span></td>
            <td><span class="plan-tag ${r.plan}">${t("plan." + r.plan)}</span></td>
            <td>${r.months} · ${UI.fmtNum(r.months * (GTIR_CONFIG.PRICES[r.plan] || 0))} ֏</td>
            <td>${esc(r.contact || "")}<br><span class="muted" style="font-size:12.5px">${esc(userEmail(r.user_id))}</span></td>
            <td>${r.status === "new" ? `<span class="status status-pending">${t("status.pending")}</span>` : `<span class="status status-approved">${t("admin.done")}</span>`}</td>
            <td>${r.status === "new" ? `<button class="btn btn-ok btn-sm" data-req="${r.id}">${icon("check")}${t("admin.markDone")}</button>` : ""}</td>
          </tr>`).join("")}</tbody></table></div>` : UI.empty(t("admin.empty")));
      $$("[data-req]").forEach((btn) => btn.addEventListener("click", async () => {
        const r = list.find((x) => x.id === btn.dataset.req);
        try { await API.admin.resolveRequest(r); UI.toast(t("admin.saved")); panes.requests(); loadStats(); }
        catch (e) { UI.toast(e.message, "err"); }
      }));
    },
    async users() {
      users = await API.admin.users();
      $("#pane").innerHTML = `<h2 style="font-size:20px;margin-bottom:14px">${t("admin.users")} (${users.length})</h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>${t("auth.email")}</th><th>${t("auth.name")}</th><th>${t("admin.role")}</th><th></th><th></th></tr></thead><tbody>
        ${users.map((u) => `<tr><td>${esc(u.email)}</td><td>${esc(u.full_name || "")}</td>
          <td>${u.role === "admin" ? `<span class="plan-tag premium">admin</span>` : `<span class="plan-tag">user</span>`}</td>
          <td class="muted">${UI.fmtDate(u.created_at)}</td>
          <td>${u.id !== user.id ? `<button class="btn btn-outline btn-sm" data-role="${u.id}" data-to="${u.role === "admin" ? "user" : "admin"}">${u.role === "admin" ? "→ user" : t("admin.makeAdmin")}</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>`;
      $$("[data-role]").forEach((btn) => btn.addEventListener("click", async () => {
        try { await API.admin.setRole(btn.dataset.role, btn.dataset.to); UI.toast(t("admin.saved")); panes.users(); }
        catch (e) { UI.toast(e.message, "err"); }
      }));
    },
  };

  async function show(name) {
    if (!panes[name]) name = "pending";
    tab = name;
    history.replaceState(null, "", "#" + name);
    $$("#sideNav button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    $("#pane").innerHTML = `<div class="skel" style="height:160px"></div>`;
    try { await panes[name](); } catch (e) { console.error(e); $("#pane").innerHTML = UI.empty(e.message || t("common.error")); }
    icons();
  }
  $$("#sideNav button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));

  users = await API.admin.users().catch(() => []);
  loadStats().then(icons);
  show(tab);
})();
