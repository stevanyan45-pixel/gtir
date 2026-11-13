/* Մուտք և գրանցում */
(async function () {
  const { esc, icon, icons, param, $, $$ } = UI;
  let mode = param("mode") === "register" ? "register" : "login";
  const next = (() => { const n = param("next"); return n && !/^(https?:)?\/\//i.test(n) && !/^javascript:/i.test(n) ? n : "account.html"; })();

  UI.layout("login");
  const existing = await API.getUser().catch(() => null);
  if (existing) { location.replace(next); return; }

  $("#app").innerHTML = `
    <div class="auth-wrap">
      <div class="auth-side">
        ${UI.logo().replace('class="logo"', 'class="logo" style="color:#fff"')}
        <h2>${t("home.ctaTitle")}</h2>
        <ul>
          <li>${icon("circle-check")}${t("plan.free.f")[0]}</li>
          <li>${icon("circle-check")}${t("plan.free.f")[2]}</li>
          <li>${icon("circle-check")}${t("plan.free.f")[3]}</li>
          <li>${icon("circle-check")}${t("plan.pro.f")[2]}</li>
        </ul>
      </div>
      <div class="auth-main">
        <div class="auth-box">
          <div class="tabs"><button data-m="login">${t("auth.login")}</button><button data-m="register">${t("auth.register")}</button></div>
          <h1 id="aTitle"></h1>
          <p class="muted" id="aSub" style="margin-top:6px"></p>
          <form id="aForm" novalidate>
            <div class="field" id="nameField"><label>${t("auth.name")}</label><input class="input" name="full_name" autocomplete="name" maxlength="80"></div>
            <div class="field"><label>${t("auth.email")}</label><input class="input" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label>${t("auth.password")}</label><input class="input" name="password" type="password" minlength="6" required></div>
            <div id="aMsg" class="alert hidden"></div>
            <button class="btn btn-primary btn-lg btn-block" type="submit" id="aBtn"></button>
            ${API.mode === "demo" ? `<p class="hint" style="text-align:center">${t("auth.demoHint")}</p>` : ""}
          </form>
        </div>
      </div>
    </div>`;
  // footer-ը մուտքի էջում պետք չէ
  const ft = document.querySelector(".site-footer"); if (ft) ft.style.marginTop = "0";

  function draw() {
    $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.m === mode));
    const reg = mode === "register";
    $("#aTitle").textContent = t(reg ? "auth.registerTitle" : "auth.loginTitle");
    $("#aSub").textContent = t(reg ? "auth.registerSub" : "auth.loginSub");
    $("#nameField").classList.toggle("hidden", !reg);
    $("#aBtn").textContent = t(reg ? "auth.register" : "auth.login");
    $("#aForm").password.autocomplete = reg ? "new-password" : "current-password";
    $("#aMsg").classList.add("hidden");
  }
  draw(); icons();
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.m; draw(); }));

  const msg = (text, type) => { const m = $("#aMsg"); m.className = "alert alert-" + type; m.textContent = text; };

  $("#aForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim(), password = f.password.value, full_name = f.full_name.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { f.email.classList.add("invalid"); return f.email.focus(); }
    if (password.length < 6) { msg(t("auth.errShort"), "danger"); return f.password.focus(); }
    const btn = $("#aBtn"); btn.disabled = true;
    try {
      if (mode === "register") {
        const r = await API.signUp({ email, password, full_name });
        if (r.needsConfirm) { msg(t("auth.checkEmail"), "ok"); mode = "login"; btn.disabled = false; return; }
      } else {
        await API.signIn({ email, password });
      }
      location.href = next;
    } catch (err) {
      msg(err.message, "danger");
      btn.disabled = false;
    }
  });
  $$("#aForm .input").forEach((el) => el.addEventListener("input", () => el.classList.remove("invalid")));
})();
