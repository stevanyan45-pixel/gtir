/* =====================================================================
   Տվյալների շերտ (API)
   Երկու տարբերակ նույն ֆունկցիաներով.
     • SupabaseAPI — իրական բազա (երբ config.js-ում կա SUPABASE_URL)
     • LocalAPI    — դեմո, տվյալները բրաուզերի localStorage-ում
   Էջերը աշխատում են միայն window.API-ի հետ։
   ===================================================================== */
(function () {
  const CFG = window.GTIR_CONFIG || {};
  const DATA = window.GTIR_DATA;
  const PAGE = 12;
  const planRank = (p) => (p === "premium" ? 2 : p === "pro" ? 1 : 0);

  // Ո՞ր կատեգորիաներն են համապատասխանում որոնման բառին (բոլոր լեզուներով)
  function matchCategories(q) {
    const s = (q || "").trim().toLowerCase();
    if (s.length < 3) return [];
    return DATA.categories
      .filter((c) => [c.hy, c.ru, c.en].some((n) => n.toLowerCase().includes(s)))
      .map((c) => c.id);
  }

  const EDITABLE = ["kind", "name", "category", "city", "address", "phone", "whatsapp", "email", "website",
    "instagram", "facebook", "description", "hours", "price_info", "photos"];
  function pickEditable(d) {
    const o = {};
    EDITABLE.forEach((k) => { if (d[k] !== undefined) o[k] = d[k]; });
    return o;
  }

  function friendly(err) {
    const m = (err && (err.message || err.error_description || String(err))) || "";
    if (/invalid login|invalid credentials/i.test(m)) return new Error(t("auth.errInvalid"));
    if (/already registered|already exists/i.test(m)) return new Error(t("auth.errExists"));
    if (/at least 6|password should/i.test(m)) return new Error(t("auth.errShort"));
    if (/email not confirmed/i.test(m)) return new Error(t("auth.checkEmail"));
    return err instanceof Error ? err : new Error(m || t("common.error"));
  }

  /* ------------------------------------------------------------------ */
  /*  SUPABASE                                                           */
  /* ------------------------------------------------------------------ */
  function SupabaseAPI() {
    const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    let userPromise = null;
    const ok = ({ data, error }) => { if (error) throw friendly(error); return data; };

    async function getUser() {
      if (!userPromise) {
        userPromise = (async () => {
          const { data: { session } } = await sb.auth.getSession();
          if (!session) return null;
          const u = session.user;
          const { data: p } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
          return {
            id: u.id, email: u.email,
            full_name: (p && p.full_name) || (u.user_metadata && u.user_metadata.full_name) || "",
            phone: (p && p.phone) || "", role: (p && p.role) || "user",
          };
        })();
      }
      return userPromise;
    }

    function applyFilters(qb, f) {
      qb = qb.eq("status", "approved");
      if (f.city) qb = qb.eq("city", f.city);
      if (f.category) qb = qb.eq("category", f.category);
      if (f.kind) qb = qb.eq("kind", f.kind);
      if (f.q && f.q.trim()) {
        const safe = f.q.replace(/[%,()*"\\.:]/g, " ").trim();
        const parts = [];
        if (safe) parts.push(`name.ilike."%${safe}%"`, `description.ilike."%${safe}%"`);
        const cats = matchCategories(f.q);
        if (cats.length) parts.push(`category.in.(${cats.join(",")})`);
        if (parts.length) qb = qb.or(parts.join(","));
      }
      return qb;
    }
    function applySort(qb, sort) {
      if (sort === "new") return qb.order("created_at", { ascending: false });
      if (sort === "popular") return qb.order("views", { ascending: false }).order("created_at", { ascending: false });
      if (sort === "rating") return qb.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
      return qb.order("plan_rank", { ascending: false }).order("rating_avg", { ascending: false }).order("created_at", { ascending: false });
    }

    return {
      mode: "supabase",
      getUser,
      async signUp({ email, password, full_name }) {
        if ((password || "").length < 6) throw new Error(t("auth.errShort"));
        const data = ok(await sb.auth.signUp({ email, password, options: { data: { full_name } } }));
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
          throw new Error(t("auth.errExists"));
        userPromise = null;
        return { needsConfirm: !data.session };
      },
      async signIn({ email, password }) {
        ok(await sb.auth.signInWithPassword({ email, password }));
        userPromise = null;
      },
      async signOut() { await sb.auth.signOut(); userPromise = null; },
      async updateProfile(d) {
        const u = await getUser();
        ok(await sb.from("profiles").update({ full_name: d.full_name, phone: d.phone }).eq("id", u.id));
        userPromise = null;
      },

      async search(f = {}) {
        const limit = f.limit || PAGE, offset = f.offset || 0;
        let qb = sb.from("businesses").select("*", { count: "exact" });
        qb = applySort(applyFilters(qb, f), f.sort).range(offset, offset + limit - 1);
        const { data, error, count } = await qb;
        if (error) throw friendly(error);
        return { items: data || [], total: count || 0 };
      },
      async popular(limit = 8) {
        return ok(await sb.from("businesses").select("*").eq("status", "approved")
          .order("plan_rank", { ascending: false }).order("views", { ascending: false }).limit(limit));
      },
      async latest(limit = 8, kind) {
        let qb = sb.from("businesses").select("*").eq("status", "approved");
        if (kind) qb = qb.eq("kind", kind);
        return ok(await qb.order("created_at", { ascending: false }).limit(limit));
      },
      async count() {
        const { count } = await sb.from("businesses").select("id", { count: "exact", head: true }).eq("status", "approved");
        return count || 0;
      },
      async getById(id) {
        if (!/^[0-9a-f-]{36}$/i.test(id || "")) return null;
        return ok(await sb.from("businesses").select("*").eq("id", id).maybeSingle());
      },
      async incrementViews(id) { await sb.rpc("increment_views", { bid: id }); },
      async create(d) {
        const u = await getUser();
        return ok(await sb.from("businesses").insert({ ...pickEditable(d), owner_id: u.id }).select().single());
      },
      async update(id, d) {
        return ok(await sb.from("businesses").update(pickEditable(d)).eq("id", id).select().single());
      },
      async remove(id) {
        const b = await this.getById(id);
        ok(await sb.from("businesses").delete().eq("id", id));
        const paths = ((b && b.photos) || []).map((url) => url.split("/object/public/photos/")[1]).filter(Boolean);
        if (paths.length) await sb.storage.from("photos").remove(paths);
      },
      async mine() {
        const u = await getUser();
        return ok(await sb.from("businesses").select("*").eq("owner_id", u.id).order("created_at", { ascending: false }));
      },
      async uploadPhoto(blob) {
        const u = await getUser();
        const path = `${u.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        ok(await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" }));
        return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
      },

      async reviews(bid) {
        return ok(await sb.from("reviews").select("*").eq("business_id", bid).order("created_at", { ascending: false }));
      },
      async addReview(bid, rating, comment) {
        const { error } = await sb.from("reviews").insert({ business_id: bid, rating, comment });
        if (error) {
          if (error.code === "23505") throw new Error(t("biz.alreadyReviewed"));
          throw friendly(error);
        }
      },
      async requestPlan({ business_id, plan, months, contact }) {
        const u = await getUser();
        ok(await sb.from("plan_requests").insert({ business_id, plan, months, contact, user_id: u.id }));
      },

      admin: {
        async list({ status, q } = {}) {
          let qb = sb.from("businesses").select("*");
          if (status) qb = qb.eq("status", status);
          if (q) qb = qb.ilike("name", `%${q.replace(/[%*]/g, "")}%`);
          return ok(await qb.order("created_at", { ascending: false }).limit(300));
        },
        async setStatus(id, status, reason) {
          ok(await sb.from("businesses").update({ status, reject_reason: status === "rejected" ? reason || "" : null }).eq("id", id));
        },
        async setPlan(id, plan, until) {
          ok(await sb.from("businesses").update({ plan, featured_until: plan === "free" ? null : until || null }).eq("id", id));
        },
        async expirePlans() {
          await sb.from("businesses").update({ plan: "free", featured_until: null })
            .neq("plan", "free").lt("featured_until", new Date().toISOString());
        },
        async stats() {
          const c = async (fn) => { const { count } = await fn(sb.from("businesses").select("id", { count: "exact", head: true })); return count || 0; };
          const [total, pending, approved] = await Promise.all([
            c((q) => q), c((q) => q.eq("status", "pending")), c((q) => q.eq("status", "approved")),
          ]);
          const { count: users } = await sb.from("profiles").select("id", { count: "exact", head: true });
          const { data: v } = await sb.from("businesses").select("views").limit(10000);
          const views = (v || []).reduce((s, r) => s + (r.views || 0), 0);
          return { total, pending, approved, users: users || 0, views };
        },
        async users() {
          return ok(await sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(500));
        },
        async setRole(uid, role) { ok(await sb.from("profiles").update({ role }).eq("id", uid)); },
        async requests() {
          return ok(await sb.from("plan_requests").select("*, businesses(name)").order("created_at", { ascending: false }).limit(200));
        },
        async resolveRequest(r) {
          const until = new Date(Date.now() + r.months * 30 * 864e5).toISOString();
          ok(await sb.from("businesses").update({ plan: r.plan, featured_until: until }).eq("id", r.business_id));
          ok(await sb.from("plan_requests").update({ status: "done" }).eq("id", r.id));
        },
        async deleteReview(id) { ok(await sb.from("reviews").delete().eq("id", id)); },
      },
      deleteReview: async (id) => ok(await sb.from("reviews").delete().eq("id", id)),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  ԴԵՄՈ (localStorage)                                                */
  /* ------------------------------------------------------------------ */
  function LocalAPI() {
    const KEY = "gtir_demo_db_v1", SKEY = "gtir_demo_session";
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2));
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(36); };
    const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
    const clone = (v) => JSON.parse(JSON.stringify(v));

    function load() {
      try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.businesses) return d; } catch (e) {}
      const d = window.GTIR_SEED ? window.GTIR_SEED(uid, hash) : { users: [], businesses: [], reviews: [], plan_requests: [] };
      save(d);
      return d;
    }
    function save(d) {
      try { localStorage.setItem(KEY, JSON.stringify(d)); }
      catch (e) { throw new Error("Բրաուզերի հիշողությունը լցված է (դեմո ռեժիմ)։ Օգտագործիր ավելի փոքր նկարներ։"); }
    }
    let db = load();
    const sessionId = () => { try { return localStorage.getItem(SKEY); } catch (e) { return null; } };
    const me = () => db.users.find((u) => u.id === sessionId()) || null;
    const isAdmin = () => (me() || {}).role === "admin";
    const publicUser = (u) => u && { id: u.id, email: u.email, full_name: u.full_name, phone: u.phone || "", role: u.role };
    const requireUser = () => { const u = me(); if (!u) throw new Error(t("auth.loginRequired")); return u; };
    const canEdit = (b) => { const u = me(); return u && (u.role === "admin" || b.owner_id === u.id); };

    function filter(f) {
      let list = db.businesses.filter((b) => b.status === "approved");
      if (f.city) list = list.filter((b) => b.city === f.city);
      if (f.category) list = list.filter((b) => b.category === f.category);
      if (f.kind) list = list.filter((b) => b.kind === f.kind);
      if (f.q && f.q.trim()) {
        const s = f.q.trim().toLowerCase(), cats = matchCategories(f.q);
        list = list.filter((b) => (b.name + " " + (b.description || "")).toLowerCase().includes(s) || cats.includes(b.category));
      }
      return list;
    }
    function sortList(list, sort) {
      const by = {
        new: (a, b) => b.created_at.localeCompare(a.created_at),
        popular: (a, b) => b.views - a.views,
        rating: (a, b) => b.rating_avg - a.rating_avg || b.rating_count - a.rating_count,
      }[sort] || ((a, b) => b.plan_rank - a.plan_rank || b.rating_avg - a.rating_avg || b.created_at.localeCompare(a.created_at));
      return list.slice().sort(by);
    }
    function refreshRating(bid) {
      const rs = db.reviews.filter((r) => r.business_id === bid && !r.seed);
      const b = db.businesses.find((x) => x.id === bid);
      if (!b) return;
      const [sa, sc] = b.seed_rating || [0, 0];
      const n = sc + rs.length;
      b.rating_count = n;
      b.rating_avg = n ? Math.round(((sa * sc + rs.reduce((s, r) => s + r.rating, 0)) / n) * 10) / 10 : 0;
    }

    return {
      mode: "demo",
      async getUser() { return delay(publicUser(me())); },
      async signUp({ email, password, full_name }) {
        email = (email || "").trim().toLowerCase();
        if ((password || "").length < 6) throw new Error(t("auth.errShort"));
        if (db.users.some((u) => u.email === email)) throw new Error(t("auth.errExists"));
        const u = { id: uid(), email, pass: hash(password), full_name: full_name || "", phone: "", role: "user", created_at: new Date().toISOString() };
        db.users.push(u); save(db);
        localStorage.setItem(SKEY, u.id);
        return delay({ needsConfirm: false });
      },
      async signIn({ email, password }) {
        email = (email || "").trim().toLowerCase();
        const u = db.users.find((x) => x.email === email && x.pass === hash(password || ""));
        if (!u) throw new Error(t("auth.errInvalid"));
        localStorage.setItem(SKEY, u.id);
        return delay();
      },
      async signOut() { localStorage.removeItem(SKEY); return delay(); },
      async updateProfile(d) {
        const u = requireUser(); u.full_name = d.full_name; u.phone = d.phone; save(db); return delay();
      },

      async search(f = {}) {
        const list = sortList(filter(f), f.sort);
        const limit = f.limit || PAGE, offset = f.offset || 0;
        return delay({ items: clone(list.slice(offset, offset + limit)), total: list.length });
      },
      async popular(limit = 8) {
        const list = filter({}).sort((a, b) => b.plan_rank - a.plan_rank || b.views - a.views);
        return delay(clone(list.slice(0, limit)));
      },
      async latest(limit = 8, kind) { return delay(clone(sortList(filter({ kind }), "new").slice(0, limit))); },
      async count() { return delay(filter({}).length); },
      async getById(id) {
        const b = db.businesses.find((x) => x.id === id);
        if (!b) return delay(null);
        if (b.status !== "approved" && !canEdit(b)) return delay(null);
        return delay(clone(b));
      },
      async incrementViews(id) {
        const b = db.businesses.find((x) => x.id === id);
        if (b && b.status === "approved") { b.views++; save(db); }
      },
      async create(d) {
        const u = requireUser();
        const admin = u.role === "admin";
        const b = {
          ...pickEditable(d), id: uid(), owner_id: u.id, status: admin ? "approved" : "pending", reject_reason: null,
          plan: "free", plan_rank: 0, featured_until: null, views: 0, rating_avg: 0, rating_count: 0,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        db.businesses.push(b); save(db);
        return delay(clone(b));
      },
      async update(id, d) {
        const b = db.businesses.find((x) => x.id === id);
        if (!b || !canEdit(b)) throw new Error(t("common.error"));
        Object.assign(b, pickEditable(d), { updated_at: new Date().toISOString() });
        if (!isAdmin()) { b.status = "pending"; b.reject_reason = null; }
        save(db);
        return delay(clone(b));
      },
      async remove(id) {
        const b = db.businesses.find((x) => x.id === id);
        if (!b || !canEdit(b)) throw new Error(t("common.error"));
        db.businesses = db.businesses.filter((x) => x.id !== id);
        db.reviews = db.reviews.filter((r) => r.business_id !== id);
        db.plan_requests = db.plan_requests.filter((r) => r.business_id !== id);
        save(db); return delay();
      },
      async mine() {
        const u = requireUser();
        return delay(clone(sortList(db.businesses.filter((b) => b.owner_id === u.id), "new")));
      },
      async uploadPhoto(blob) {
        requireUser();
        return new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
      },

      async reviews(bid) {
        return delay(clone(db.reviews.filter((r) => r.business_id === bid).sort((a, b) => b.created_at.localeCompare(a.created_at))));
      },
      async addReview(bid, rating, comment) {
        const u = requireUser();
        const b = db.businesses.find((x) => x.id === bid);
        if (!b || b.status !== "approved") throw new Error(t("common.error"));
        if (b.owner_id === u.id) throw new Error(t("biz.ownReview"));
        if (db.reviews.some((r) => r.business_id === bid && r.user_id === u.id)) throw new Error(t("biz.alreadyReviewed"));
        db.reviews.push({ id: uid(), business_id: bid, user_id: u.id, author_name: u.full_name || "Օգտատեր", rating, comment, created_at: new Date().toISOString() });
        refreshRating(bid); save(db); return delay();
      },
      async deleteReview(id) {
        const u = requireUser();
        const r = db.reviews.find((x) => x.id === id);
        if (!r || (r.user_id !== u.id && u.role !== "admin")) throw new Error(t("common.error"));
        db.reviews = db.reviews.filter((x) => x.id !== id);
        refreshRating(r.business_id); save(db); return delay();
      },
      async requestPlan({ business_id, plan, months, contact }) {
        const u = requireUser();
        db.plan_requests.push({ id: uid(), business_id, user_id: u.id, plan, months, contact, status: "new", created_at: new Date().toISOString() });
        save(db); return delay();
      },

      admin: {
        async list({ status, q } = {}) {
          if (!isAdmin()) throw new Error(t("admin.noAccess"));
          let list = db.businesses;
          if (status) list = list.filter((b) => b.status === status);
          if (q) list = list.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
          return delay(clone(sortList(list, "new")));
        },
        async setStatus(id, status, reason) {
          if (!isAdmin()) throw new Error(t("admin.noAccess"));
          const b = db.businesses.find((x) => x.id === id);
          b.status = status; b.reject_reason = status === "rejected" ? reason || "" : null;
          save(db); return delay();
        },
        async setPlan(id, plan, until) {
          if (!isAdmin()) throw new Error(t("admin.noAccess"));
          const b = db.businesses.find((x) => x.id === id);
          b.plan = plan; b.plan_rank = planRank(plan); b.featured_until = plan === "free" ? null : until || null;
          save(db); return delay();
        },
        async expirePlans() {
          const now = new Date().toISOString();
          db.businesses.forEach((b) => {
            if (b.plan !== "free" && b.featured_until && b.featured_until < now) { b.plan = "free"; b.plan_rank = 0; b.featured_until = null; }
          });
          save(db);
        },
        async stats() {
          const bs = db.businesses;
          return delay({
            total: bs.length, pending: bs.filter((b) => b.status === "pending").length,
            approved: bs.filter((b) => b.status === "approved").length, users: db.users.length,
            views: bs.reduce((s, b) => s + b.views, 0),
          });
        },
        async users() {
          if (!isAdmin()) throw new Error(t("admin.noAccess"));
          return delay(clone(db.users.map(({ pass, ...u }) => u)).reverse());
        },
        async setRole(id, role) {
          if (!isAdmin()) throw new Error(t("admin.noAccess"));
          db.users.find((u) => u.id === id).role = role; save(db); return delay();
        },
        async requests() {
          if (!isAdmin()) throw new Error(t("admin.noAccess"));
          return delay(clone(db.plan_requests.map((r) => ({ ...r, businesses: { name: (db.businesses.find((b) => b.id === r.business_id) || {}).name } }))).reverse());
        },
        async resolveRequest(r) {
          const until = new Date(Date.now() + r.months * 30 * 864e5).toISOString();
          await this.setPlan(r.business_id, r.plan, until);
          db.plan_requests.find((x) => x.id === r.id).status = "done"; save(db); return delay();
        },
        async deleteReview(id) {
          db.reviews = db.reviews.filter((x) => x.id !== id); save(db); return delay();
        },
        resetDemo() { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); },
      },
    };
  }

  const useSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  window.API = useSupabase ? SupabaseAPI() : LocalAPI();
  window.API.matchCategories = matchCategories;
  window.API.planRank = planRank;
})();
