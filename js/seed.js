/* Դեմո տվյալներ — օգտագործվում են միայն ԴԵՄՈ ռեժիմում (առանց Supabase) */
window.GTIR_SEED = function (uid, hash) {
  const now = Date.now();
  const ago = (d) => new Date(now - d * 864e5).toISOString();
  const admin = { id: uid(), email: "admin@gtir.am", pass: hash("admin123"), full_name: "Ադմին", phone: "", role: "admin", created_at: ago(30) };
  const owner = { id: uid(), email: "demo@gtir.am", pass: hash("demo123"), full_name: "Անի Պետրոսյան", phone: "", role: "user", created_at: ago(20) };

  const rows = [
    ["company", "«Արև» գեղեցկության սրահ", "beauty", "yerevan", "Աբովյան 12", "+374 91 123456", "Վարսահարդարում, մատնահարդարում, դիմահարդարում։ Փորձառու վարպետներ և պրեմիում խնամքի միջոցներ։ Վարսահարդար, մանիկյուր, պեդիկյուր։", "Երկ–Կիր 10:00–21:00", "սկսած 3000 ֏", "premium", 412, 4.9, 38, 25],
    ["specialist", "Արմեն Հակոբյան — սանտեխնիկ", "repair", "yerevan", "", "+374 93 555111", "Սանտեխնիկական աշխատանքներ 15 տարվա փորձով. ծորակներ, ջրատաքացուցիչներ, խողովակներ։ Արագ արձագանք ամբողջ Երևանում։", "Ամեն օր 08:00–22:00", "սկսած 5000 ֏", "pro", 268, 4.8, 21, 18],
    ["company", "Dental Smile կլինիկա", "health", "yerevan", "Կոմիտաս 45", "+374 10 223344", "Ատամնաբուժական ամբողջական ծառայություններ. իմպլանտներ, սպիտակեցում, օրթոդոնտիա։ Ժամանակակից սարքավորումներ։ Ատամնաբույժ։", "Երկ–Շբթ 09:00–19:00", "Խորհրդատվություն՝ անվճար", "premium", 530, 4.7, 52, 40],
    ["company", "Gyumri Taste ռեստորան", "food", "gyumri", "Վարդանանց հրապարակ 3", "+374 312 50505", "Ավանդական գյումրեցիական խոհանոց, կենդանի երաժշտություն հանգստյան օրերին և բանկետային սրահ մինչև 120 հյուրի համար։", "Ամեն օր 11:00–00:00", "", "pro", 190, 4.6, 17, 12],
    ["specialist", "Լիլիթ Սարգսյան — անգլերենի դասեր", "education", "online", "", "+374 98 777888", "Անգլերենի անհատական և խմբային դասեր առցանց. IELTS, TOEFL նախապատրաստում, խոսակցական անգլերեն երեխաների և մեծահասակների համար։", "Ըստ պայմանավորվածության", "6000 ֏ / դաս", "free", 145, 5.0, 9, 6],
    ["company", "AutoPro ավտոսերվիս", "auto", "vanadzor", "Տիգրան Մեծի 20", "+374 322 40404", "Ավտոմեքենաների դիագնոստիկա, շարժիչի վերանորոգում, անվադողերի փոխարինում և հավասարակշռում։", "Երկ–Շբթ 09:00–19:00", "", "free", 88, 4.4, 7, 9],
    ["specialist", "Դավիթ Գրիգորյան — լուսանկարիչ", "photo", "yerevan", "", "+374 94 101010", "Հարսանեկան, ընտանեկան և բիզնես լուսանկարահանում։ Love story, պորտֆոլիո և արտադրանքի լուսանկարներ։ Լուսանկարիչ։", "", "սկսած 40000 ֏", "free", 120, 4.9, 14, 3],
    ["company", "CleanHouse մաքրման ծառայություն", "cleaning", "yerevan", "", "+374 77 333222", "Բնակարանների և գրասենյակների մաքրում, հետվերանորոգման մաքրում, գորգերի և կահույքի քիմմաքրում։", "Ամեն օր 08:00–20:00", "սկսած 15000 ֏", "free", 64, 4.5, 6, 2],
    ["specialist", "Գոռ Մանուկյան — էլեկտրիկ", "repair", "abovyan", "", "+374 95 202020", "Էլեկտրական լարերի անցկացում, վարդակներ, լուսատուներ, էլ. վահանակների տեղադրում։ Էլեկտրիկ, երաշխիքով աշխատանք։", "Ամեն օր 09:00–21:00", "", "free", 51, 4.7, 5, 1],
    ["company", "Dilijan Forest հյուրատուն", "tourism", "dilijan", "Գետափնյա 7", "+374 268 21212", "Հարմարավետ հյուրատուն անտառի մեջ. տնական նախաճաշ, բուխարի, արշավներ և էքսկուրսիաներ Դիլիջանի ազգային պարկում։", "", "սկսած 25000 ֏ / գիշեր", "pro", 230, 4.8, 26, 15],
    ["company", "WebStudio AM", "it", "online", "", "+374 99 909090", "Կայքերի պատրաստում, առցանց խանութներ, SEO և Instagram-ի գովազդ փոքր բիզնեսների համար։", "Երկ–Ուրբ 10:00–19:00", "սկսած 80000 ֏", "free", 77, 4.6, 4, 4],
    ["company", "Happy Party միջոցառումներ", "events", "yerevan", "Մաշտոցի պող. 30", "+374 41 404040", "Մանկական տոներ, անիմատորներ, փուչիկներով ձևավորում, հարսանիքների և ծննդյան օրերի կազմակերպում։", "Ամեն օր 10:00–20:00", "", "free", 99, 4.5, 8, 0.5],
  ];

  const businesses = rows.map((r) => ({
    id: uid(), owner_id: owner.id, kind: r[0], name: r[1], category: r[2], city: r[3], address: r[4], phone: r[5],
    whatsapp: r[5], email: "", website: "", instagram: "", facebook: "", description: r[6], hours: r[7], price_info: r[8],
    photos: [], status: "approved", reject_reason: null, plan: r[9], plan_rank: r[9] === "premium" ? 2 : r[9] === "pro" ? 1 : 0,
    featured_until: r[9] === "free" ? null : new Date(now + 30 * 864e5).toISOString(),
    views: r[10], rating_avg: r[11], rating_count: r[12], seed_rating: [r[11], r[12]], created_at: ago(r[13]), updated_at: ago(r[13]),
  }));

  businesses.push({
    id: uid(), owner_id: owner.id, kind: "company", name: "Petshop Ձագուկ", category: "pets", city: "gyumri", address: "Ռիժկովի 5",
    phone: "+374 93 121212", whatsapp: "", email: "", website: "", instagram: "", facebook: "",
    description: "Կենդանիների կեր, խաղալիքներ և աքսեսուարներ։", hours: "", price_info: "", photos: [],
    status: "pending", reject_reason: null, plan: "free", plan_rank: 0, featured_until: null,
    views: 0, rating_avg: 0, rating_count: 0, created_at: ago(0.2), updated_at: ago(0.2),
  });

  const reviews = [
    { id: uid(), business_id: businesses[0].id, user_id: admin.id, author_name: "Մարիամ", seed: true, rating: 5, comment: "Շատ գոհ եմ, վարպետները պրոֆեսիոնալ են, մթնոլորտը՝ հաճելի։", created_at: ago(3) },
    { id: uid(), business_id: businesses[2].id, user_id: admin.id, author_name: "Արամ", seed: true, rating: 5, comment: "Ցավազուրկ և արագ։ Խորհուրդ եմ տալիս։", created_at: ago(5) },
  ];

  return { users: [admin, owner], businesses, reviews, plan_requests: [] };
};
