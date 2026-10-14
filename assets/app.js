/* KVKKpilot uygulaması: pano, sihirbaz, rapor, belgeler, denetim, asistan */
(function () {
  const K = window.KVKK;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TL = (n) => n.toLocaleString("tr-TR") + " ₺";
  const view = $("#view");

  /* ---------- Depolama ---------- */
  const KEY = "kvkkpilot.v1";
  let mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { mem = null; }
    if (!mem || !Array.isArray(mem.biz)) mem = { biz: [JSON.parse(JSON.stringify(K.SAMPLE))] };
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  const getBiz = (id) => load().biz.find((b) => b.id === id);
  function upsert(b) { const d = load(); const i = d.biz.findIndex((x) => x.id === b.id); if (i >= 0) d.biz[i] = b; else d.biz.unshift(b); save(); }
  function removeBiz(id) { const d = load(); d.biz = d.biz.filter((b) => b.id !== id); save(); }

  /* ---------- Yardımcılar ---------- */
  let toastT;
  function toast(msg) {
    let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
  }
  const scoreColor = (s) => (s >= 80 ? "var(--ok)" : s >= 50 ? "var(--warn)" : "var(--seal)");
  function ring(score, r, w) {
    const c = 2 * Math.PI * r;
    return `<svg viewBox="0 0 ${2 * r + w} ${2 * r + w}" aria-hidden="true"><circle cx="${r + w / 2}" cy="${r + w / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${w}"/><circle class="arc" cx="${r + w / 2}" cy="${r + w / 2}" r="${r}" fill="none" stroke="${scoreColor(score)}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - score / 100)).toFixed(1)}"/></svg>`;
  }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function wordDoc(title, text) {
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5">${esc(text).split("\n").map((l) => `<p style="margin:0 0 4pt">${l || "&nbsp;"}</p>`).join("")}</body></html>`;
  }
  function printText(title, sub, text) {
    $("#print").innerHTML = `<h1>${esc(title)}</h1><div class="ph">${esc(sub)} · KVKKpilot ile hazırlandı · ${new Date().toLocaleDateString("tr-TR")}</div>${esc(text)}`;
    window.print();
  }
  const slug = (s) => s.toLowerCase().replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  /* ---------- Yapay zekâ ---------- */
  let AI = null; // null: bilinmiyor, false: yok, true: var
  const aiReady = fetch("/api/ai").then((r) => (r.ok ? r.json() : { ai: false })).then((d) => (AI = !!d.ai)).catch(() => (AI = false));
  async function ai(messages, json) {
    const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages, json: !!json }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Yapay zekâ servisine ulaşılamadı.");
    if (!json) return d.text;
    const t = d.text.trim(); const m = t.match(/\{[\s\S]*\}/);
    try { return JSON.parse(m ? m[0] : t); } catch (e) { throw new Error("Yanıt okunamadı, tekrar deneyin."); }
  }
  function profileLine(p, a) {
    return `İşletme: ${p.name}; sektör: ${K.SECTOR[p.sector].s}; şehir: ${p.city || "-"}; ${p.emp} çalışan. Veri kategorileri: ${p.cats.map((c) => c.l).join(", ") || "-"}. Kanallar: ${p.channels.map((c) => c.l).join(", ") || "-"}. Yurt dışı servisler: ${p.abroad.map((c) => c.l).join(", ") || "yok"}. VERBİS: ${a.req ? "zorunlu" : "muaf"}. Uyum skoru: ${a.score}/100.`;
  }

  /* ---------- Yönlendirme ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (!parts.length) return dashboard();
    if (parts[0] === "yeni") return wizard(null);
    if (parts[0] === "duzenle" && parts[1]) return wizard(parts[1]);
    if (parts[0] === "i" && parts[1]) return workspace(parts[1], parts[2] || "rapor");
    dashboard();
  }
  window.addEventListener("hashchange", route);

  /* ---------- Pano ---------- */
  function dashboard() {
    document.title = "İşletmelerim · KVKKpilot";
    const list = load().biz;
    view.innerHTML = `
      <div class="pagehead"><div><p class="eyebrow">Pano</p><h1>İşletmelerim</h1></div><a class="btn seal" href="#/yeni">+ Yeni analiz</a></div>
      <div class="biz">
        ${list.map((b) => {
          const p = K.expand(b), a = K.analyze(p);
          return `<a class="card bizcard" href="#/i/${esc(b.id)}">
            <div class="top"><div class="mini">${ring(a.score, 24, 7)}<b>${a.score}</b></div>
            <div><h3>${esc(b.name)}</h3><p class="note">${esc(K.SECTOR[b.sector].l)} · ${esc(b.city || "")} · ${b.emp} çalışan</p></div></div>
            <div class="meta"><span class="pill ${a.req ? (b.m.verbis ? "ok" : "bad") : "ok"}">VERBİS: ${a.req ? (b.m.verbis ? "kayıtlı" : "zorunlu") : "muaf"}</span>
            <span class="pill ${a.acts.length ? "warn" : "ok"}">${a.acts.length} açık eylem</span>
            <span class="pill ${a.fmax ? "bad" : "ok"}">risk ${a.fmax ? (a.fmax / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " mn ₺" : "yok"}</span></div>
          </a>`;
        }).join("")}
        <a class="card bizcard newcard" href="#/yeni"><b>+</b><span>Yeni işletme ekle<br><small>5 adım, yaklaşık 3 dakika</small></span></a>
      </div>`;
  }

  /* ---------- Sihirbaz ---------- */
  const STEPS = ["Kimlik", "Büyüklük", "Veriler", "Kanallar", "Önlemler"];
  function wizard(id) {
    const existing = id ? getBiz(id) : null;
    const d = existing ? JSON.parse(JSON.stringify(existing)) : { id: "b" + Date.now().toString(36), name: "", sector: "eticaret", city: "", address: "", contact: "", emp: 5, bal: 10, bilanco: true, mainSpecial: false, cats: ["kimlik", "iletisim", "finans", "musteri"], channels: ["web"], abroad: [], m: {}, created: Date.now() };
    let step = 0;
    document.title = (existing ? "Düzenle" : "Yeni analiz") + " · KVKKpilot";
    const chipList = (list, sel, name) => `<div class="chips">${list.map((c) => `<label class="chip"><input type="checkbox" name="${name}" value="${c.id}" ${sel.includes(c.id) ? "checked" : ""}><span>${esc(c.l)}${c.sp ? "<small>özel</small>" : ""}</span></label>`).join("")}</div>`;
    function body() {
      if (step === 0) return `<h2>İşletmenizi tanıyalım</h2>
        <label class="f">Unvan<input type="text" id="w-name" value="${esc(d.name)}" placeholder="ör. Yıldız Gıda Ltd. Şti."></label>
        <div class="grid2"><label class="f">Sektör<select id="w-sector">${Object.entries(K.SECTOR).map(([k, v]) => `<option value="${k}" ${d.sector === k ? "selected" : ""}>${esc(v.l)}</option>`).join("")}</select></label>
        <label class="f">Şehir<input type="text" id="w-city" value="${esc(d.city)}" placeholder="ör. Samsun"></label></div>
        <label class="f">Açık adres (belgelerde kullanılır)<input type="text" id="w-address" value="${esc(d.address)}"></label>
        <label class="f">KVKK başvuruları için e-posta<input type="email" id="w-contact" value="${esc(d.contact)}" placeholder="kvkk@firmaniz.com"></label>`;
      if (step === 1) return `<h2>Büyüklük</h2><p class="note">VERBİS kayıt yükümlülüğü bu bilgilere göre hesaplanır.</p>
        <div class="grid2"><label class="f">Yıllık çalışan sayısı<input type="number" id="w-emp" min="0" value="${d.emp}"></label>
        <label class="f">Yıllık bilanço toplamı (milyon ₺)<input type="number" id="w-bal" min="0" step="0.1" value="${d.bal}"></label></div>
        <div class="stack"><label class="toggle"><input type="checkbox" id="w-bilanco" ${d.bilanco ? "checked" : ""}> <span>Bilanço esasına göre defter tutuyoruz<br><small class="note">İşletme defteri tutanlar için yalnızca çalışan sayısı dikkate alınır.</small></span></label>
        <label class="toggle"><input type="checkbox" id="w-sp" ${d.mainSpecial ? "checked" : ""}> <span>Ana faaliyetimiz özel nitelikli veri işlemek<br><small class="note">Klinik, laboratuvar, psikolog, diyetisyen gibi.</small></span></label></div>`;
      if (step === 2) return `<h2>Hangi kişisel verileri işliyorsunuz?</h2><p class="note">Müşteri, ziyaretçi ve çalışanlarınız için düşünün. "Özel" etiketli olanlar KVKK md.6 kapsamındadır.</p>${chipList(K.CATS, d.cats, "cats")}`;
      if (step === 3) return `<h2>Verileri nereden topluyorsunuz?</h2>${chipList(K.CHANNELS, d.channels, "channels")}
        <h2 style="font-size:19px;margin-top:8px">Hangi yabancı servisleri kullanıyorsunuz?</h2><p class="note">Sunucusu yurt dışında olan her servis KVKK md.9 kapsamında yurt dışına aktarım sayılır.</p>${chipList(K.ABROAD, d.abroad, "abroad")}`;
      return `<h2>Bugüne kadar neler yaptınız?</h2><p class="note">Emin olmadıklarınızı boş bırakın; rapor bunları eylem olarak önerecek.</p>
        <div class="stack">${K.MEASURES.map((m) => `<label class="toggle"><input type="checkbox" name="m" value="${m.id}" ${d.m[m.id] ? "checked" : ""}> <span>${esc(m.l)}</span></label>`).join("")}</div>`;
    }
    function collect() {
      const v = (s) => $(s) && $(s).value;
      if (step === 0) { d.name = v("#w-name").trim(); d.sector = v("#w-sector"); d.city = v("#w-city").trim(); d.address = v("#w-address").trim(); d.contact = v("#w-contact").trim(); }
      if (step === 1) { d.emp = Math.max(0, +v("#w-emp") || 0); d.bal = Math.max(0, +v("#w-bal") || 0); d.bilanco = $("#w-bilanco").checked; d.mainSpecial = $("#w-sp").checked; }
      const vals = (n) => $$(`input[name=${n}]:checked`).map((x) => x.value);
      if (step === 2) d.cats = vals("cats");
      if (step === 3) { d.channels = vals("channels"); d.abroad = vals("abroad"); }
      if (step === 4) { const on = vals("m"); d.m = Object.fromEntries(K.MEASURES.map((m) => [m.id, on.includes(m.id)])); }
    }
    function validate() {
      if (step === 0 && !d.name) return "Unvan girin.";
      if (step === 2 && !d.cats.length) return "En az bir veri kategorisi seçin.";
      if (step === 3 && !d.channels.length) return "En az bir kanal seçin.";
      return "";
    }
    function paint() {
      view.innerHTML = `<div class="wizard">
        <a class="crumb" href="${existing ? "#/i/" + esc(d.id) : "#/"}">← ${existing ? "Rapora dön" : "İşletmelerim"}</a>
        <div class="progress">${STEPS.map((s, i) => `<div class="${i <= step ? "on" : ""}"><i></i><span>${i + 1}. ${s}</span></div>`).join("")}</div>
        <form class="card step" id="wf" novalidate>${body()}<p class="err" id="werr" hidden></p>
          <div class="wnav"><button type="button" class="btn ghost" id="back" ${step === 0 ? "disabled" : ""}>Geri</button>
          <button type="submit" class="btn ${step === 4 ? "seal" : ""}">${step === 4 ? (existing ? "Kaydet ve raporu güncelle" : "Raporu oluştur") : "Devam"}</button></div>
        </form></div>`;
      const first = $("#wf input, #wf select"); if (first) first.focus({ preventScroll: true });
      $("#back").onclick = () => { collect(); step--; paint(); };
      $("#wf").onsubmit = (e) => {
        e.preventDefault(); collect();
        const msg = validate(); if (msg) { $("#werr").textContent = msg; $("#werr").hidden = false; return; }
        if (step < 4) { step++; paint(); return; }
        d.updated = Date.now(); upsert(d); toast(existing ? "Kaydedildi" : "Rapor hazır"); location.hash = "#/i/" + d.id;
      };
    }
    paint();
  }

  /* ---------- Çalışma alanı ---------- */
  const TABS = [["rapor", "Uyum raporu"], ["belgeler", "Belgeler"], ["denetim", "Metin denetimi"], ["asistan", "KVKK asistanı"]];
  function workspace(id, tab) {
    const b = getBiz(id);
    if (!b) { view.innerHTML = `<div class="pagehead"><h1>İşletme bulunamadı</h1></div><p>Bu tarayıcıda böyle bir kayıt yok. <a href="#/">İşletmelerime dön</a></p>`; return; }
    const p = K.expand(b), a = K.analyze(p);
    document.title = b.name + " · KVKKpilot";
    view.innerHTML = `
      <a class="crumb" href="#/">← İşletmelerim</a>
      <div class="pagehead" style="margin-top:8px"><div><p class="eyebrow">${esc(K.SECTOR[b.sector].l)} · ${esc(b.city || "")}</p><h1>${esc(b.name)}</h1></div>
        <div class="toolbar"><a class="btn ghost sm" href="#/duzenle/${esc(b.id)}">Bilgileri düzenle</a><button class="btn ghost sm" id="del">Sil</button></div></div>
      <nav class="tabs">${TABS.map(([k, l]) => `<a href="#/i/${esc(b.id)}/${k}" ${k === tab ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <div id="pane"></div>`;
    $("#del").onclick = () => {
      const btn = $("#del");
      if (btn.dataset.confirm) { removeBiz(b.id); toast("İşletme silindi"); location.hash = "#/"; return; }
      btn.dataset.confirm = "1"; btn.textContent = "Silmek için tekrar tıklayın"; btn.classList.add("seal");
      setTimeout(() => { if (btn.isConnected) { delete btn.dataset.confirm; btn.textContent = "Sil"; btn.classList.remove("seal"); } }, 4000);
    };
    const pane = $("#pane");
    if (tab === "belgeler") return docsPane(pane, b, p, a);
    if (tab === "denetim") return auditPane(pane, b, p, a);
    if (tab === "asistan") return chatPane(pane, b, p, a);
    reportPane(pane, b, p, a);
  }

  function reportPane(pane, b, p, a) {
    const hi = a.acts.filter((x) => x.sev === "hi").length;
    const lim = p.mainSpecial ? "10 çalışan / 10 mn ₺" : "50 çalışan / 100 mn ₺";
    pane.innerHTML = `
      <div class="card summary">
        <div class="gauge">${ring(a.score, 64, 12)}<div class="val"><div><b>${a.score}</b><small>uyum skoru</small></div></div></div>
        <div class="verdict">
          <h2>${a.score >= 80 ? "Uyum seviyeniz iyi, birkaç rötuş kaldı" : a.score >= 50 ? "Temeller var, kritik eksikler kapanmalı" : "Ciddi uyum açığı var"}</h2>
          <p>${a.acts.length} eylem bulundu, ${hi} tanesi yüksek öncelikli. ${hi ? "Önce kırmızı işaretli maddeleri kapatın; bunlar doğrudan idari para cezası riski taşıyor." : "Kalan maddeler iyi uygulama niteliğinde."}</p>
          <div class="bar" title="Tamamlanan yükümlülükler"><i style="width:${a.applicable ? Math.round((a.done / a.applicable) * 100) : 100}%"></i></div>
          <p class="note" style="margin-top:6px">${a.done} / ${a.applicable} yükümlülük tamamlandı</p>
        </div>
      </div>
      <div class="stats">
        <div class="card stat"><span class="k">VERBİS kaydı</span><span class="v">${a.req ? `<span class="pill ${p.m.verbis ? "ok" : "bad"}">${p.m.verbis ? "Kayıtlı" : "Zorunlu · yapılmamış"}</span>` : '<span class="pill ok">Muaf</span>'}</span><span class="d">Eşik: ${lim}${p.bilanco ? " (ikisi birlikte)" : " (yalnız çalışan sayısı)"}. Siz: ${p.emp} çalışan${p.bilanco ? ", " + p.bal.toLocaleString("tr-TR") + " mn ₺" : ""}.</span></div>
        <div class="card stat"><span class="k">Ceza riski (üst sınır)</span><span class="v" style="color:${a.fmax ? "var(--bad)" : "var(--ok)"}">${TL(a.fmax)}</span><span class="d">${a.fmax ? "Alt sınır toplamı " + TL(a.fmin) + "." : "Eksik yükümlülük kalmadı."}</span></div>
        <div class="card stat"><span class="k">Açık eylem</span><span class="v">${a.acts.length}</span><span class="d">${hi} yüksek · ${a.acts.filter((x) => x.sev === "md").length} orta · ${a.acts.filter((x) => x.sev === "lo").length} düşük öncelik</span></div>
      </div>
      <div class="sec">
        <div class="sechead"><h3>Eylem planı</h3><button class="btn ghost sm" id="pdf">Raporu PDF olarak kaydet</button></div>
        <ul class="actions">${a.acts.length ? a.acts.map((x) => `<li class="${x.sev}"><div><b>${esc(x.t)}</b><span>${esc(x.d)}</span></div><div class="right"><code>${esc(x.ref)}</code><button class="btn ghost sm" data-done="${x.mid}">Tamamlandı</button></div></li>`).join("")
          : '<li class="lo"><div><b>Açık eylem yok</b><span>Yılda bir gözden geçirme yapmanız yeterli.</span></div><div class="right"><code>✓</code></div></li>'}</ul>
      </div>
      <div class="sec">
        <div class="sechead"><h3>2026 ceza maruziyeti</h3><span class="note">KVKK md.18, eksik yükümlülük başına</span></div>
        <div class="tablewrap"><table><thead><tr><th>Yükümlülük</th><th>Durum</th><th class="num">Alt sınır</th><th class="num">Üst sınır</th></tr></thead><tbody>
          ${a.fines.map((f) => { const F = K.FINES[f.k]; return `<tr><td>${F.l}</td><td>${f.na ? '<span class="pill ok">Uygulanmaz</span>' : f.miss ? '<span class="pill bad">Eksik</span>' : '<span class="pill ok">Karşılandı</span>'}</td><td class="num">${TL(F.min)}</td><td class="num">${TL(F.max)}</td></tr>`; }).join("")}
        </tbody><tfoot><tr><td colspan="2">Toplam maruziyet</td><td class="num">${TL(a.fmin)}</td><td class="num">${TL(a.fmax)}</td></tr></tfoot></table></div>
      </div>
      <p class="disclaimer">Ceza tutarları 27.11.2025 tarihli ve 33090 sayılı Resmî Gazete'de ilan edilen 2026 yeniden değerleme oranına (%25,49) göre hesaplanmıştır. VERBİS değerlendirmesi Kurul'un 2025/2393 sayılı kararındaki esaslara dayanır. Bu rapor hukuki danışmanlık değildir.</p>`;
    $$("[data-done]", pane).forEach((btn) => btn.addEventListener("click", () => {
      const before = a.score; b.m[btn.dataset.done] = true; b.updated = Date.now(); upsert(b);
      const after = K.analyze(K.expand(b)).score;
      toast(`Tamamlandı · skor ${before} → ${after}`); route();
    }));
    $("#pdf").onclick = () => {
      const lines = [`Uyum skoru: ${a.score}/100`, `VERBİS: ${a.req ? (p.m.verbis ? "kayıtlı" : "ZORUNLU, kayıt yapılmamış") : "muaf"}`, `Ceza riski: ${TL(a.fmin)} – ${TL(a.fmax)}`, "", "EYLEM PLANI", ...a.acts.map((x, i) => `${i + 1}. [${x.sev === "hi" ? "YÜKSEK" : x.sev === "md" ? "ORTA" : "DÜŞÜK"}] ${x.t} (${x.ref})\n   ${x.d}`)];
      printText("KVKK Uyum Raporu", b.name, lines.join("\n"));
    };
  }

  const aiDocs = {}; // id+doc -> metin (oturum içi)
  function docsPane(pane, b, p, a) {
    let cur = sessionStorage.getItem("kp.doc") || "aydinlatma";
    if (!K.DOCS.some((d) => d.id === cur)) cur = "aydinlatma";
    pane.innerHTML = `
      <div class="sechead"><h3>Hazır belgeler</h3><span class="note">İşletme bilgilerinize göre otomatik üretilir</span></div>
      <div class="doctabs" id="dt" style="margin-top:12px">${K.DOCS.map((d) => `<button type="button" data-d="${d.id}" aria-pressed="${d.id === cur}">${d.l}</button>`).join("")}</div>
      <div class="toolbar" style="margin-top:14px">
        <button class="btn seal" id="aiDoc" hidden>✦ Yapay zekâ ile sektörüme göre iyileştir</button>
        <button class="btn ghost" id="cp">Kopyala</button><button class="btn ghost" id="word">Word (.doc)</button><button class="btn ghost" id="pdfd">PDF</button>
        <button class="btn ghost" id="reset" hidden>Şablona dön</button></div>
      <div class="status" id="ds" style="margin-block:8px"></div>
      <div class="doc" id="dv"></div>`;
    const keyOf = () => b.id + ":" + cur;
    const text = () => aiDocs[keyOf()] || K.gen(cur, p, a);
    function show() {
      $("#dv").textContent = text(); $("#reset").hidden = !aiDocs[keyOf()];
      $("#ds").className = "status"; $("#ds").textContent = aiDocs[keyOf()] ? "Yapay zekâ tarafından sektörünüze göre iyileştirildi." : "";
      $$("#dt button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.d === cur));
    }
    $("#dt").onclick = (e) => { const t = e.target.closest("button"); if (!t) return; cur = t.dataset.d; try { sessionStorage.setItem("kp.doc", cur); } catch (_) {} show(); };
    $("#reset").onclick = () => { delete aiDocs[keyOf()]; show(); };
    $("#cp").onclick = async () => { try { await navigator.clipboard.writeText(text()); toast("Panoya kopyalandı"); } catch (e) { const r = document.createRange(); r.selectNodeContents($("#dv")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Metin seçildi, Ctrl+C ile kopyalayın"); } };
    $("#word").onclick = () => { const d = K.DOCS.find((x) => x.id === cur); download(`${slug(d.l)}-${slug(b.name)}.doc`, wordDoc(d.l, text()), "application/msword"); toast("Word dosyası indirildi"); };
    $("#pdfd").onclick = () => { const d = K.DOCS.find((x) => x.id === cur); printText(d.l, b.name, text()); };
    aiReady.then(() => {
      if (!AI || !$("#aiDoc")) return; $("#aiDoc").hidden = false;
      $("#aiDoc").onclick = async () => {
        const id = cur, k = keyOf(), d = K.DOCS.find((x) => x.id === id);
        $("#aiDoc").disabled = true; $("#ds").className = "status"; $("#ds").textContent = "Yapay zekâ belgeyi yazıyor, 20-40 saniye sürebilir…";
        try {
          const out = await ai([{ role: "user", content: `Aşağıdaki "${d.l}" taslağını bu işletme için daha somut ve sektöre özgü hâle getir. Kurallar: başlık yapısını koru; uydurma kanun maddesi yazma; sektöre özgü gerçek veri işleme senaryoları ekle; sade Türkçe; düz metin döndür, Markdown kullanma; açıklama ekleme, yalnızca belgeyi yaz.\n${profileLine(p, a)}\n\nTASLAK:\n${K.gen(id, p, a)}` }]);
          aiDocs[k] = out.replace(/\*\*/g, "").trim(); if (cur === id) show();
        } catch (e) { $("#ds").className = "status err"; $("#ds").textContent = e.message; }
        finally { if ($("#aiDoc")) $("#aiDoc").disabled = false; }
      };
    });
    show();
  }

  const SAMPLE_TEXT = "Gizlilik Politikası\nLiman Kahve olarak gizliliğinize önem veriyoruz. Siparişinizi teslim edebilmek için adınızı, adresinizi ve telefon numaranızı alıyoruz. Bilgileriniz kargo firmalarıyla paylaşılabilir. Sitemizde deneyiminizi iyileştirmek için çerezler kullanılmaktadır. Sorularınız için bize info@limankahve.com.tr adresinden ulaşabilirsiniz.";
  function auditPane(pane, b, p, a) {
    pane.innerHTML = `
      <div class="sec" style="margin-top:0"><h3>Mevcut gizlilik metninizi denetleyin</h3>
        <p class="muted" style="margin:0;max-width:68ch">Sitenizdeki aydınlatma metnini veya gizlilik politikasını yapıştırın. KVKK md.10 ve Aydınlatma Yükümlülüğü Tebliği'nin istediği 10 unsur kontrol edilir.</p>
        <label class="f" for="at">Metin</label><textarea id="at" rows="9">${esc(b.auditText || SAMPLE_TEXT)}</textarea>
        <div class="toolbar"><button class="btn" id="run">Denetle</button><button class="btn ghost" id="mine">Kendi aydınlatma metnimizi dene</button></div></div>
      <div class="sec"><div class="sechead"><h3>Kural motoru sonucu</h3><span class="pill" id="asc"></span></div><div class="checks" id="ac"></div></div>
      <div class="sec" id="aiSec" hidden><h3>Yapay zekâ değerlendirmesi</h3><div class="status" id="as"></div><div id="aiOut"></div></div>`;
    function rules() {
      const res = K.audit($("#at").value); const ok = res.filter((r) => r.ok).length; const pct = Math.round((ok / res.length) * 100);
      $("#ac").innerHTML = res.map((r) => `<div class="chk ${r.ok ? "y" : "n"}"><span class="ic">${r.ok ? "✓" : "✕"}</span><div>${esc(r.t)}<small>${esc(r.h)}</small></div></div>`).join("");
      $("#asc").className = "pill " + (pct >= 80 ? "ok" : pct >= 50 ? "warn" : "bad"); $("#asc").textContent = `${ok}/${res.length} unsur · %${pct}`;
    }
    async function run() {
      rules(); b.auditText = $("#at").value; upsert(b);
      await aiReady; if (!AI || !$("#at").value.trim()) return;
      $("#aiSec").hidden = false; $("#as").className = "status"; $("#as").textContent = "Yapay zekâ metni inceliyor…"; $("#aiOut").innerHTML = ""; $("#run").disabled = true;
      try {
        const out = await ai([{ role: "user", content: `Aşağıdaki gizlilik/aydınlatma metnini KVKK md.10 ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ'e göre denetle. ${profileLine(p, a)}\nYalnızca şu JSON'u döndür: {"ozet":"2 cümlelik genel değerlendirme","sorunlar":[{"baslik":"kısa","neden":"hangi madde/neden","duzeltme":"metne eklenecek örnek cümle"}],"guclu":["varsa iyi yönler"]}. En fazla 6 sorun, en önemlisi önce.\n\nMETİN:\n"""${$("#at").value.slice(0, 8000)}"""` }], true);
        const s = Array.isArray(out.sorunlar) ? out.sorunlar : [];
        $("#aiOut").innerHTML = `<p style="margin:0 0 12px">${esc(out.ozet || "")}</p><ul class="actions">${s.map((x) => `<li class="hi"><div><b>${esc(x.baslik)}</b><span>${esc(x.neden)}</span><span style="display:block;margin-top:6px;color:var(--ink)">Öneri: “${esc(x.duzeltme)}”</span></div><div class="right"><code>AI</code></div></li>`).join("")}</ul>${Array.isArray(out.guclu) && out.guclu.length ? `<p class="note" style="margin-top:10px">Güçlü yönler: ${out.guclu.map(esc).join(" · ")}</p>` : ""}`;
        $("#as").textContent = "";
      } catch (e) { $("#as").className = "status err"; $("#as").textContent = e.message; }
      finally { if ($("#run")) $("#run").disabled = false; }
    }
    $("#run").onclick = run;
    $("#mine").onclick = () => { $("#at").value = K.gen("aydinlatma", p, a); rules(); toast("KVKKpilot metni yüklendi, Denetle'ye basın"); };
    $("#at").addEventListener("input", rules);
    rules();
  }

  const chats = {};
  function chatPane(pane, b, p, a) {
    const turns = (chats[b.id] = chats[b.id] || []);
    pane.innerHTML = `
      <div class="sechead"><h3>KVKK asistanı</h3><span class="note">İşletmenizin bilgilerini bilerek cevaplar</span></div>
      <div id="off" class="offai" hidden style="margin-top:12px">Asistan bu kurulumda kapalı: sunucuda yapay zekâ anahtarı tanımlı değil. Rapor, belgeler ve kural tabanlı denetim tam olarak çalışır.</div>
      <div id="on" hidden style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
        <div class="sugg" id="sg">${["Müşteriye WhatsApp'tan kampanya atabilir miyim?", "Veri ihlali olursa ne yapmalıyım?", "Google Analytics için ne yapmam gerekiyor?", "Kamera kayıtlarını ne kadar saklayabilirim?"].map((q) => `<button type="button">${q}</button>`).join("")}</div>
        <div class="chat" id="log" aria-live="polite">${turns.length ? "" : '<div class="msg a">Merhaba! ' + esc(b.name) + " için KVKK sorularınızı yanıtlayabilirim. Ne öğrenmek istersiniz?</div>"}</div>
        <form class="chatform" id="cf"><input type="text" id="ci" placeholder="Sorunuzu yazın…" autocomplete="off"><button class="btn" id="cs">Sor</button></form>
        <div class="status" id="cst"></div>
      </div>`;
    const log = $("#log");
    const bubble = (role, text) => { const d = document.createElement("div"); d.className = "msg " + (role === "user" ? "u" : "a"); d.textContent = text; log.appendChild(d); log.scrollTop = 1e9; return d; };
    turns.forEach((t) => bubble(t.role, t.content));
    async function ask(q) {
      q = q.trim(); if (!q) return;
      $("#ci").value = ""; bubble("user", q); turns.push({ role: "user", content: q });
      const w = bubble("assistant", "Yazıyor…"); $("#cs").disabled = true; $("#cst").textContent = "";
      try {
        const ctx = `Kullanıcının işletmesi hakkında bilgi: ${profileLine(p, a)} Kısa cevap ver (en fazla 6 cümle veya 5 madde) ve ilgili madde numarasını belirt.`;
        const msgs = [{ role: "user", content: ctx }, { role: "assistant", content: "Anlaşıldı, bu işletmeye göre yanıtlayacağım." }, ...turns.slice(-10)];
        const text = await ai(msgs); w.textContent = text.replace(/\*\*/g, ""); turns.push({ role: "assistant", content: w.textContent });
      } catch (e) { w.remove(); turns.pop(); $("#cst").className = "status err"; $("#cst").textContent = e.message; }
      finally { if ($("#cs")) $("#cs").disabled = false; log.scrollTop = 1e9; }
    }
    $("#cf").onsubmit = (e) => { e.preventDefault(); ask($("#ci").value); };
    $("#sg").onclick = (e) => { const t = e.target.closest("button"); if (t) ask(t.textContent); };
    aiReady.then(() => { if (!$("#on")) return; if (AI) { $("#on").hidden = false; } else { $("#off").hidden = false; } });
  }

  load(); save(); route();
})();
