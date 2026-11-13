/* Գներ և վճարովի փաթեթներ */
(async function () {
  const { esc, icon, icons, param, $, $$ } = UI;
  const P = GTIR_CONFIG.PRICES;
  UI.layout("pricing");

  const plan = (id, cls, ribbon, btn) => `
    <div class="plan ${cls}">
      ${ribbon ? `<span class="ribbon">${ribbon}</span>` : ""}
      <div><h3>${t("plan." + id)}</h3><p class="muted" style="margin-top:4px">${t("plan." + id + ".d")}</p></div>
      <div class="price">${UI.fmtNum(P[id])} ֏ <small>${t("plan.month")}</small></div>
      <ul>${t("plan." + id + ".f").map((f) => `<li>${icon("check")}<span>${esc(f)}</span></li>`).join("")}</ul>
      ${btn}
    </div>`;

  $("#app").innerHTML = `
    <div class="container" style="padding-bottom:40px">
      <div class="page-head" style="text-align:center;padding-top:50px">
        <h1>${t("pricing.title")}</h1>
        <p style="font-size:17px">${t("pricing.sub")}</p>
      </div>
      <div class="plans">
        ${plan("free", "", "", `<a class="btn btn-outline btn-lg btn-block" href="add.html">${t("pricing.start")}</a>`)}
        ${plan("pro", "hot", t("pricing.popular"), `<button class="btn btn-primary btn-lg btn-block" data-plan="pro">${t("pricing.choose")}</button>`)}
        ${plan("premium", "gold", "", `<button class="btn btn-accent btn-lg btn-block" data-plan="premium">${icon("crown")}${t("pricing.choose")}</button>`)}
      </div>
      <div class="alert alert-info" style="max-width:720px;margin:40px auto 0;justify-content:center">${icon("info")}${t("pricing.payNote")}</div>
    </div>`;
  icons();

  $$("[data-plan]").forEach((btn) => btn.addEventListener("click", async () => {
    const planId = btn.dataset.plan;
    const user = await API.getUser().catch(() => null);
    if (!user) { location.href = "login.html?next=" + encodeURIComponent("pricing.html"); return; }
    const mine = (await API.mine().catch(() => [])).filter((b) => b.status === "approved");
    if (!mine.length) {
      UI.toast(t("pricing.needListing"), "err");
      setTimeout(() => (location.href = "add.html"), 1500);
      return;
    }
    const pre = param("biz");
    const total = (m) => `${UI.fmtNum(m * P[planId])} ֏`;
    await UI.modal({
      title: `${t("pricing.requestTitle")}: ${t("plan." + planId)}`,
      okText: t("pricing.sendRequest"),
      body: `<div style="display:grid;gap:14px">
        <div class="field"><label>${t("pricing.selectBiz")}</label><select class="select" id="rBiz">
          ${mine.map((b) => `<option value="${b.id}" ${b.id === pre ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></div>
        <div class="row-2">
          <div class="field"><label>${t("pricing.months")}</label><select class="select" id="rMonths">${[1, 3, 6, 12].map((m) => `<option value="${m}">${m}</option>`).join("")}</select></div>
          <div class="field"><label>${t("pricing.contact")}</label><input class="input" id="rContact" type="tel" value="${esc(user.phone || "")}" placeholder="+374 __ ______"></div>
        </div>
        <div class="alert alert-ok" style="justify-content:space-between"><span>${t("pricing.total")}</span><b id="rTotal">${total(1)}</b></div>
        <p class="hint">${t("pricing.payNote")}</p></div>`,
      onOk: async (m) => {
        const contact = m.querySelector("#rContact").value.trim();
        if (contact.replace(/\D/g, "").length < 6) { m.querySelector("#rContact").classList.add("invalid"); return false; }
        await API.requestPlan({ business_id: m.querySelector("#rBiz").value, plan: planId, months: +m.querySelector("#rMonths").value, contact });
        UI.toast(t("pricing.requestSent"));
      },
    });
  }));
  document.addEventListener("change", (e) => {
    if (e.target.id === "rMonths") {
      const planId = document.querySelector(".modal h3").textContent.includes("Premium") ? "premium" : "pro";
      document.getElementById("rTotal").textContent = `${UI.fmtNum(+e.target.value * P[planId])} ֏`;
    }
  });
})();
