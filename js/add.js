/* Բիզնեսի ավելացում / խմբագրում */
(async function () {
  const { esc, icon, icons, cityOptions, catOptions, param, $, $$ } = UI;
  const MAX_PHOTOS = 6;
  UI.layout("add");
  const user = await UI.requireUser();
  if (!user) return;

  const editId = param("id");
  let b = null;
  if (editId) {
    b = await API.getById(editId).catch(() => null);
    if (!b || (b.owner_id !== user.id && user.role !== "admin")) {
      $("#app").innerHTML = `<div class="container"><div class="center-box">${UI.empty(t("biz.notFound"))}</div></div>`;
      return icons();
    }
  }
  const v = (k) => esc((b && b[k]) || "");
  let photos = (b && b.photos ? b.photos.slice() : []);
  let uploading = 0;

  $("#app").innerHTML = `
    <div class="container" style="max-width:860px">
      <div class="page-head">
        <h1>${t(b ? "form.editTitle" : "form.addTitle")}</h1>
        <p>${t("form.subtitle")}</p>
      </div>
      ${b ? `<div class="alert alert-info" style="margin:16px 0 0">${icon("info")}${t("form.editNote")}</div>` : ""}
      <form class="form-card" id="bizForm" novalidate style="margin:22px 0 50px">
        <div class="form-section">
          <h3><span class="n">1</span>${t("form.sectionMain")}</h3>
          <div class="field"><label>${t("form.kind")}</label>
            <div class="kind-pick">
              <label><input type="radio" name="kind" value="company" ${!b || b.kind === "company" ? "checked" : ""}>${icon("building-2")}${t("kind.company")}</label>
              <label><input type="radio" name="kind" value="specialist" ${b && b.kind === "specialist" ? "checked" : ""}>${icon("user")}${t("kind.specialist")}</label>
            </div></div>
          <div class="field"><label>${t("form.name")} *</label><input class="input" name="name" maxlength="120" required value="${v("name")}" placeholder="${esc(t("form.namePh"))}"></div>
          <div class="row-2">
            <div class="field"><label>${t("form.category")} *</label><select class="select" name="category" required>${catOptions(b && b.category, t("form.select"))}</select></div>
            <div class="field"><label>${t("form.city")} *</label><select class="select" name="city" required>${cityOptions(b ? b.city : "yerevan", t("form.select"))}</select></div>
          </div>
          <div class="field"><label>${t("form.address")} <small>(${t("form.optional")})</small></label><input class="input" name="address" maxlength="200" value="${v("address")}" placeholder="${esc(t("form.addressPh"))}"></div>
        </div>

        <div class="form-section">
          <h3><span class="n">2</span>${t("form.sectionContacts")}</h3>
          <div class="row-2">
            <div class="field"><label>${t("form.phone")} *</label><input class="input" name="phone" type="tel" required maxlength="30" value="${b ? v("phone") : esc(user.phone || "")}" placeholder="+374 __ ______"></div>
            <div class="field"><label>${t("form.whatsapp")} <small>(${t("form.optional")})</small></label><input class="input" name="whatsapp" type="tel" maxlength="30" value="${v("whatsapp")}" placeholder="+374 __ ______"></div>
          </div>
          <div class="row-2">
            <div class="field"><label>${t("form.email")} <small>(${t("form.optional")})</small></label><input class="input" name="email" type="email" maxlength="120" value="${v("email")}"></div>
            <div class="field"><label>${t("form.website")} <small>(${t("form.optional")})</small></label><input class="input" name="website" maxlength="200" value="${v("website")}" placeholder="example.am"></div>
          </div>
          <div class="row-2">
            <div class="field"><label>${t("form.instagram")} <small>(${t("form.optional")})</small></label><input class="input" name="instagram" maxlength="200" value="${v("instagram")}" placeholder="@username"></div>
            <div class="field"><label>${t("form.facebook")} <small>(${t("form.optional")})</small></label><input class="input" name="facebook" maxlength="200" value="${v("facebook")}"></div>
          </div>
        </div>

        <div class="form-section">
          <h3><span class="n">3</span>${t("form.sectionDetails")}</h3>
          <div class="field"><label>${t("form.description")}</label><textarea class="textarea" name="description" maxlength="3000" placeholder="${esc(t("form.descPh"))}">${v("description")}</textarea></div>
          <div class="row-2">
            <div class="field"><label>${t("form.hours")} <small>(${t("form.optional")})</small></label><input class="input" name="hours" maxlength="120" value="${v("hours")}" placeholder="${esc(t("form.hoursPh"))}"></div>
            <div class="field"><label>${t("form.price")} <small>(${t("form.optional")})</small></label><input class="input" name="price_info" maxlength="120" value="${v("price_info")}" placeholder="${esc(t("form.pricePh"))}"></div>
          </div>
        </div>

        <div class="form-section">
          <h3><span class="n">4</span>${t("form.sectionPhotos")}</h3>
          <p class="hint">${t("form.photosHint")}</p>
          <div class="photos-grid" id="photos"></div>
          <input type="file" id="fileIn" accept="image/jpeg,image/png,image/webp" multiple hidden>
        </div>

        <div id="formErr" class="alert alert-danger hidden" style="margin-bottom:14px">${icon("circle-alert")}<span></span></div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" id="submitBtn">${icon(b ? "save" : "send")}${t(b ? "form.save" : "form.submit")}</button>
      </form>
    </div>`;

  function drawPhotos() {
    const items = photos.map((p, i) => `
      <div class="ph-item" title="${i ? "★" : ""}" data-i="${i}">
        <img src="${esc(p)}" alt="">
        ${i === 0 ? `<span class="main-tag">★</span>` : ""}
        <button type="button" class="rm" data-rm="${i}" aria-label="remove">${icon("x")}</button>
      </div>`).join("");
    const loaders = Array.from({ length: uploading }, () => `<div class="ph-item skel"></div>`).join("");
    const add = photos.length + uploading < MAX_PHOTOS
      ? `<label class="ph-add" for="fileIn">${icon("image-plus")}<span>${t("form.addPhoto")}</span></label>` : "";
    $("#photos").innerHTML = items + loaders + add;
    icons();
    $$("[data-rm]").forEach((btn) => btn.addEventListener("click", (e) => {
      e.stopPropagation(); photos.splice(+btn.dataset.rm, 1); drawPhotos();
    }));
    // Սեղմիր նկարի վրա՝ այն գլխավոր դարձնելու համար
    $$(".ph-item[data-i]").forEach((el) => el.addEventListener("click", () => {
      const i = +el.dataset.i; if (!i) return;
      photos.unshift(photos.splice(i, 1)[0]); drawPhotos();
    }));
  }
  drawPhotos();

  $("#fileIn").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files).slice(0, MAX_PHOTOS - photos.length - uploading);
    e.target.value = "";
    uploading += files.length; drawPhotos();
    for (const f of files) {
      try {
        const blob = await UI.compressImage(f);
        const url = await API.uploadPhoto(blob);
        photos.push(url);
      } catch (err) { UI.toast(err.message, "err"); }
      uploading--; drawPhotos();
    }
  });

  $("#bizForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {};
    ["name", "category", "city", "address", "phone", "whatsapp", "email", "website", "instagram", "facebook", "description", "hours", "price_info"]
      .forEach((k) => (data[k] = f[k].value.trim()));
    data.kind = f.kind.value;
    data.photos = photos;

    const required = ["name", "category", "city", "phone"];
    let bad = false;
    required.forEach((k) => {
      const miss = !data[k] || (k === "name" && data[k].length < 2) || (k === "phone" && data[k].replace(/\D/g, "").length < 6);
      f[k].classList.toggle("invalid", miss);
      if (miss) bad = true;
    });
    const errBox = $("#formErr");
    if (bad) {
      errBox.classList.remove("hidden"); errBox.querySelector("span").textContent = t("form.required");
      f.querySelector(".invalid").focus();
      return;
    }
    if (uploading) return UI.toast(t("form.uploading"), "err");
    errBox.classList.add("hidden");

    const btn = $("#submitBtn");
    btn.disabled = true; btn.lastChild.textContent = t("form.sending");
    try {
      const saved = b ? await API.update(b.id, data) : await API.create(data);
      window.scrollTo(0, 0);
      $("#app").innerHTML = `<div class="container"><div class="center-box">
        <div class="success-ico">${icon("circle-check")}</div>
        <h1 style="font-size:30px">${t("form.successTitle")}</h1>
        <p class="muted">${saved.status === "approved" ? t("admin.saved") : t("form.successText")}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px">
          <a class="btn btn-primary" href="account.html">${t("acc.myListings")}</a>
          <a class="btn btn-outline" href="business.html?id=${encodeURIComponent(saved.id)}">${t("acc.view")}</a>
        </div></div></div>`;
      icons();
    } catch (err) {
      console.error(err);
      errBox.classList.remove("hidden"); errBox.querySelector("span").textContent = err.message || t("common.error");
      btn.disabled = false; btn.lastChild.textContent = t(b ? "form.save" : "form.submit");
    }
  });
  $$("#bizForm .input, #bizForm .select").forEach((el) => el.addEventListener("input", () => el.classList.remove("invalid")));
})();
