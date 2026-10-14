/* KVKKpilot kural motoru — mevzuat verisi, analiz, belge üretici, metin denetimi */
(function (g) {
  const CATS = [
    { id: "kimlik", l: "Kimlik", ex: "ad, soyad, T.C. kimlik no, doğum tarihi" },
    { id: "iletisim", l: "İletişim", ex: "telefon, e-posta, adres" },
    { id: "finans", l: "Finans", ex: "fatura bilgileri, IBAN, ödeme kayıtları" },
    { id: "musteri", l: "Müşteri işlem", ex: "sipariş geçmişi, talep ve şikâyetler" },
    { id: "pazarlama", l: "Pazarlama", ex: "tercih ve ilgi alanları, kampanya izinleri" },
    { id: "online", l: "Çerez / işlem güvenliği", ex: "IP adresi, çerez kimlikleri, log kayıtları" },
    { id: "gorsel", l: "Görsel (kamera)", ex: "güvenlik kamerası kayıtları, fotoğraf" },
    { id: "konum", l: "Konum", ex: "teslimat konumu, cihaz konumu" },
    { id: "personel", l: "Personel", ex: "özlük dosyası, bordro, SGK bilgileri" },
    { id: "saglik", l: "Sağlık", ex: "teşhis, tahlil, reçete, rapor", sp: 1 },
    { id: "biyometrik", l: "Biyometrik", ex: "parmak izi, yüz tanıma şablonu", sp: 1 },
  ];
  const CHANNELS = [
    { id: "web", l: "Web sitesi" }, { id: "mobil", l: "Mobil uygulama" }, { id: "magaza", l: "Fiziksel mağaza" },
    { id: "whatsapp", l: "WhatsApp / SMS" }, { id: "telefon", l: "Çağrı / telefon" }, { id: "form", l: "Kâğıt form" },
  ];
  const ABROAD = [
    { id: "ga", l: "Google Analytics" }, { id: "meta", l: "Meta Pixel" }, { id: "cloud", l: "Yurt dışı bulut (AWS/GCP)" },
    { id: "mail", l: "Mailchimp vb. e-posta" }, { id: "crm", l: "Yabancı CRM (HubSpot vb.)" },
  ];
  const MEASURES = [
    { id: "aydinlatma", l: "Sitede/mağazada aydınlatma metni var", w: 18 },
    { id: "cerez", l: "Çerez yönetim paneli (rıza alan banner) var", w: 10 },
    { id: "riza", l: "Pazarlama için ayrı açık rıza alınıyor", w: 10 },
    { id: "verbis", l: "VERBİS kaydı yapıldı", w: 14 },
    { id: "envanter", l: "Kişisel veri işleme envanteri hazır", w: 10 },
    { id: "saklama", l: "Saklama ve imha politikası var", w: 8 },
    { id: "guvenlik", l: "Erişim yetkilendirme + şifreleme + log kaydı", w: 12 },
    { id: "ihlal", l: "Veri ihlali müdahale prosedürü (72 saat)", w: 8 },
    { id: "sozlesme", l: "Yurt dışı aktarım için standart sözleşme imzalandı ve bildirildi", w: 10 },
  ];
  const SECTOR = {
    eticaret: { l: "E-ticaret", s: "e-ticaret", amac: ["siparişlerin alınması, faturalandırılması ve teslimatı", "iade, değişim ve müşteri taleplerinin yönetimi", "mesafeli satış sözleşmesinden doğan yükümlülüklerin yerine getirilmesi"], alici: "kargo ve lojistik firmaları, ödeme kuruluşları, muhasebe/mali müşavirlik hizmeti sağlayıcıları" },
    saglik: { l: "Sağlık / klinik", s: "sağlık", amac: ["tıbbi teşhis, tedavi ve bakım hizmetlerinin yürütülmesi", "randevu süreçlerinin yönetimi", "Sağlık Bakanlığı ve SGK'ya karşı yasal bildirimlerin yapılması"], alici: "Sağlık Bakanlığı, SGK, özel sağlık sigortası şirketleri, anlaşmalı laboratuvarlar" },
    egitim: { l: "Eğitim / kurs", s: "eğitim", amac: ["kayıt ve eğitim süreçlerinin yürütülmesi", "sınav, değerlendirme ve sertifika işlemleri", "veli ve öğrenci iletişiminin sağlanması"], alici: "Milli Eğitim Bakanlığı, sınav kuruluşları, ödeme kuruluşları" },
    restoran: { l: "Restoran / kafe", s: "yeme-içme", amac: ["rezervasyon ve sipariş süreçlerinin yürütülmesi", "paket servis teslimatı", "sadakat programının yönetimi"], alici: "paket servis platformları, ödeme kuruluşları, muhasebe hizmeti sağlayıcıları" },
    saas: { l: "Yazılım / SaaS", s: "yazılım", amac: ["hesap oluşturma ve hizmetin sunulması", "abonelik ve faturalandırma işlemleri", "teknik destek ve ürün güvenliğinin sağlanması"], alici: "barındırma ve altyapı sağlayıcıları, ödeme kuruluşları, destek yazılımı sağlayıcıları" },
    perakende: { l: "Perakende mağaza", s: "perakende", amac: ["satış ve fatura işlemlerinin yürütülmesi", "mağaza güvenliğinin sağlanması", "garanti, iade ve değişim süreçlerinin yönetimi"], alici: "ödeme kuruluşları, güvenlik hizmeti sağlayıcıları, muhasebe hizmeti sağlayıcıları" },
    otel: { l: "Otel / konaklama", s: "konaklama", amac: ["rezervasyon ve konaklama hizmetlerinin sunulması", "1774 sayılı Kimlik Bildirme Kanunu kapsamında konaklayan bildirimlerinin yapılması", "misafir memnuniyeti süreçlerinin yönetimi"], alici: "Emniyet Genel Müdürlüğü (KBS), acenteler ve rezervasyon platformları, ödeme kuruluşları" },
  };
  /* 6698 s. KVKK md.18 — 2026 tutarları (27.11.2025 tarih, 33090 sayılı RG, yeniden değerleme %25,49) */
  const FINES = {
    aydinlatma: { l: "Aydınlatma yükümlülüğü (md.10)", min: 85437, max: 1709200 },
    guvenlik: { l: "Veri güvenliği (md.12)", min: 256357, max: 17092242 },
    verbis: { l: "VERBİS kayıt ve bildirim (md.16)", min: 341809, max: 17092242 },
    sozlesme: { l: "Standart sözleşme bildirimi (md.9)", min: 90308, max: 1806377 },
  };
  const RETENTION = { kimlik: "İlişki süresi + 10 yıl (TTK md.82, VUK md.253)", iletisim: "İlişki süresi + 10 yıl", finans: "10 yıl (TTK md.82, VUK md.253)", musteri: "İlişki süresi + 10 yıl", pazarlama: "Rıza geri alınana kadar, en fazla ilişki bitiminden 2 yıl", online: "2 yıl (5651 s. Kanun trafik kayıtları için 1-2 yıl)", gorsel: "30 gün (olay incelemesi hariç)", konum: "Teslimat tamamlanana kadar", personel: "İşten ayrılış + 10 yıl", saglik: "İlgili sağlık mevzuatındaki süre", biyometrik: "Amaç sona erince derhal" };

  const byId = (list, ids) => list.filter((x) => (ids || []).includes(x.id));
  function expand(b) {
    return Object.assign({}, b, { cats: byId(CATS, b.cats), channels: byId(CHANNELS, b.channels), abroad: byId(ABROAD, b.abroad), m: b.m || {} });
  }

  /* Kurul 2025/2393: bilanço esasına göre defter tutanlarda iki kriter birlikte; tutmayanlarda yalnız çalışan sayısı */
  function verbisRequired(p) {
    if (p.mainSpecial) { const e = p.emp < 10, b = p.bal < 10; return p.bilanco ? !(e && b) : !e; }
    const e = p.emp < 50, b = p.bal < 100; return p.bilanco ? !(e && b) : !e;
  }

  function analyze(p) {
    const req = verbisRequired(p);
    const hasSpecial = p.cats.some((c) => c.sp);
    const hasAbroad = p.abroad.length > 0;
    const usesCookies = p.channels.some((c) => c.id === "web" || c.id === "mobil");
    const marketing = p.cats.some((c) => c.id === "pazarlama") || p.channels.some((c) => c.id === "whatsapp");
    const applies = { aydinlatma: 1, cerez: usesCookies, riza: marketing || hasSpecial, verbis: req, envanter: 1, saklama: 1, guvenlik: 1, ihlal: 1, sozlesme: hasAbroad };
    let tot = 0, got = 0;
    MEASURES.forEach((x) => { if (applies[x.id]) { tot += x.w; if (p.m[x.id]) got += x.w; } });
    const score = tot ? Math.round((got / tot) * 100) : 100;
    const acts = [];
    const add = (sev, mid, t, d, ref) => acts.push({ sev, mid, t, d, ref });
    if (!p.m.aydinlatma) add("hi", "aydinlatma", "Aydınlatma metnini yayınlayın", "Veri toplanan her kanalda (site, mağaza, WhatsApp) erişilebilir olmalı. Belgeler bölümünde hazır.", "md.10");
    if (req && !p.m.verbis) add("hi", "verbis", "VERBİS'e kaydolun", "Eşikleri aştığınız için kayıt zorunlu. Envanteri hazırlayıp verbis.kvkk.gov.tr üzerinden bildirin.", "md.16");
    if (!p.m.guvenlik) add("hi", "guvenlik", "Teknik ve idari tedbirleri alın", "Yetki matrisi, şifreleme, erişim logları ve çalışan gizlilik taahhütnameleri.", "md.12");
    if (hasAbroad && !p.m.sozlesme) add("hi", "sozlesme", "Yurt dışı aktarım için standart sözleşme imzalayın", p.abroad.map((a) => a.l).join(", ") + " yurt dışına veri aktarır. Sözleşmeyi imzadan itibaren 5 iş günü içinde Kurum'a bildirin.", "md.9");
    if (hasSpecial && !p.m.riza) add("hi", "riza", "Özel nitelikli veri için hukuki dayanağı netleştirin", "Sağlık/biyometrik veriler md.6 kapsamında ek güvence ister; Kurul'un yeterli önlemler kararını uygulayın.", "md.6");
    if (usesCookies && !p.m.cerez) add("md", "cerez", "Çerez yönetim paneli kurun", "Zorunlu olmayan çerezler (Analytics, Pixel) açık rıza alınmadan çalışmamalı. 'Reddet' butonu 'Kabul et' kadar görünür olmalı.", "Çerez Rehberi");
    if (marketing && !hasSpecial && !p.m.riza) add("md", "riza", "Pazarlama için ayrı açık rıza alın", "Kampanya mesajları için açık rıza aydınlatmadan ayrı alınmalı; ticari elektronik ileti için İYS kaydı da gerekir.", "md.5 · 6563");
    if (!p.m.envanter) add("md", "envanter", "Veri işleme envanterini çıkarın", "Hangi veri, hangi amaçla, ne kadar süre, kime aktarılıyor. Belgeler bölümünde taslak hazır.", "Yönetmelik");
    if (!p.m.ihlal) add("md", "ihlal", "Veri ihlali prosedürü yazın", "İhlal öğrenildikten sonra en geç 72 saat içinde Kurul'a, makul sürede ilgililere bildirim.", "md.12/5");
    if (!p.m.saklama) add("lo", "saklama", "Saklama ve imha politikası hazırlayın", "Kayıt yükümlüsüyseniz zorunlu; değilseniz bile periyodik imha (6 ayda bir) önerilir.", "Yönetmelik");
    const order = { hi: 0, md: 1, lo: 2 };
    acts.sort((a, b) => order[a.sev] - order[b.sev]);
    const fines = [
      { k: "aydinlatma", miss: !p.m.aydinlatma, na: false },
      { k: "guvenlik", miss: !p.m.guvenlik || !p.m.ihlal, na: false },
      { k: "verbis", miss: req && !p.m.verbis, na: !req },
      { k: "sozlesme", miss: hasAbroad && !p.m.sozlesme, na: !hasAbroad },
    ];
    let fmin = 0, fmax = 0;
    fines.forEach((f) => { if (f.miss) { fmin += FINES[f.k].min; fmax += FINES[f.k].max; } });
    const done = MEASURES.filter((x) => applies[x.id] && p.m[x.id]).length;
    const applicable = MEASURES.filter((x) => applies[x.id]).length;
    return { score, req, acts, fines, fmin, fmax, hasSpecial, hasAbroad, usesCookies, marketing, applies, done, applicable };
  }

  const DOCS = [
    { id: "aydinlatma", l: "Aydınlatma metni" }, { id: "cerez", l: "Çerez politikası" }, { id: "envanter", l: "Veri envanteri" },
    { id: "riza", l: "Açık rıza metni" }, { id: "ihlal", l: "İhlal müdahale planı" },
  ];
  const today = () => new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  function gen(id, p, a) {
    const S = SECTOR[p.sector] || SECTOR.eticaret; const cats = p.cats; const ch = p.channels.map((c) => c.l.toLowerCase());
    const contact = p.contact || "[e-posta]";
    const legal = ["Kanunlarda açıkça öngörülmesi (md.5/2-a)", "Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (md.5/2-c)", "Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi (md.5/2-ç)", "İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat (md.5/2-f)"];
    if (id === "aydinlatma") return `KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ
Son güncelleme: ${today()}

${p.name} ("Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan çerçevede işlemekteyiz.

1. VERİ SORUMLUSU
Unvan: ${p.name}
Adres: ${p.address || p.city || "[adres]"}
İletişim: ${contact}

2. İŞLENEN KİŞİSEL VERİLER
${cats.filter((c) => c.id !== "personel").map((c) => `• ${c.l}: ${c.ex}`).join("\n")}

3. İŞLEME AMAÇLARI
${S.amac.map((x) => "• " + x).join("\n")}
• yasal yükümlülüklerin ve yetkili kurum taleplerinin yerine getirilmesi
• bilgi güvenliği süreçlerinin yürütülmesi${a.marketing ? "\n• açık rızanız bulunması hâlinde kampanya ve tanıtım iletişimi" : ""}

4. HUKUKİ SEBEPLER
${legal.map((x) => "• " + x).join("\n")}${a.marketing ? "\n• Pazarlama faaliyetleri için açık rızanız (md.5/1)" : ""}${a.hasSpecial ? "\n• Özel nitelikli kişisel veriler için KVKK md.6/3'te sayılan sebepler ve gerektiğinde açık rızanız" : ""}

5. TOPLAMA YÖNTEMİ
Kişisel verileriniz ${ch.join(", ") || "Şirket kanalları"} aracılığıyla otomatik ve kısmen otomatik yollarla toplanmaktadır.

6. AKTARIM
Yurt içi: ${S.alici}, yetkili kamu kurum ve kuruluşları.${a.hasAbroad ? `
Yurt dışı: ${p.abroad.map((x) => x.l).join(", ")} hizmetlerinin sunucuları yurt dışında bulunduğundan, verileriniz KVKK md.9 uyarınca standart sözleşme güvencesiyle yurt dışına aktarılmaktadır.` : ""}

7. HAKLARINIZ (KVKK md.11)
Şirkete başvurarak; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, KVKK md.7 çerçevesinde silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.

Başvurularınızı ${contact} adresine veya yazılı olarak Şirket adresine iletebilirsiniz. Talebiniz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.`;

    if (id === "cerez") return `ÇEREZ POLİTİKASI
Son güncelleme: ${today()}

${p.name} olarak internet sitemizde ve uygulamamızda çerezler kullanıyoruz. Bu politika, Kişisel Verileri Koruma Kurumu'nun Çerez Uygulamaları Hakkında Rehberi esas alınarak hazırlanmıştır.

1. ÇEREZ NEDİR?
Çerezler, ziyaret ettiğiniz sitenin cihazınıza kaydettiği küçük metin dosyalarıdır.

2. KULLANDIĞIMIZ ÇEREZ TÜRLERİ
• Zorunlu çerezler: Sepet, oturum ve güvenlik işlevleri için gereklidir. Hukuki sebep: sözleşmenin ifası ve meşru menfaat (md.5/2-c, f). Rıza gerektirmez.
• İşlevsel çerezler: Dil ve tercihlerinizi hatırlar. Açık rızanıza dayanır.${p.abroad.some((x) => x.id === "ga") ? "\n• Analitik çerezler (Google Analytics): Site kullanımını ölçer. Açık rızanıza dayanır; veriler yurt dışına aktarılır." : ""}${p.abroad.some((x) => x.id === "meta") ? "\n• Pazarlama çerezleri (Meta Pixel): Size ilgili reklamlar gösterir. Açık rızanıza dayanır; veriler yurt dışına aktarılır." : ""}

3. RIZANIZI NASIL YÖNETİRSİNİZ?
Siteye ilk girişinizde çıkan panelde "Tümünü kabul et", "Tümünü reddet" ve "Tercihleri yönet" seçenekleri eşit görünürlükte sunulur. Zorunlu olmayan çerezler rızanız alınmadan çalıştırılmaz. Tercihinizi istediğiniz zaman sayfanın altındaki "Çerez ayarları" bağlantısından değiştirebilirsiniz.

4. SAKLAMA SÜRESİ
Oturum çerezleri tarayıcı kapanınca silinir. Kalıcı çerezler en fazla 13 ay saklanır.

5. İLETİŞİM
${contact}`;

    if (id === "envanter") {
      const rows = cats.map((c) => {
        const pers = c.id === "personel";
        return `${c.l.toUpperCase()}
  Veriler      : ${c.ex}
  İlgili kişi  : ${pers ? "Çalışanlar" : "Müşteriler / ziyaretçiler"}
  Amaç         : ${pers ? "İş sözleşmesi ve SGK yükümlülükleri" : c.id === "pazarlama" ? "Kampanya iletişimi" : c.id === "online" ? "Bilgi güvenliği, site analizi" : c.id === "gorsel" ? "Fiziksel mekân güvenliği" : S.amac[0]}
  Hukuki sebep : ${c.sp ? "md.6/3" : c.id === "pazarlama" ? "Açık rıza (md.5/1)" : c.id === "gorsel" ? "Meşru menfaat (md.5/2-f)" : pers ? "Kanun + sözleşme (md.5/2-a, c)" : "Sözleşme (md.5/2-c)"}
  Saklama      : ${RETENTION[c.id]}
  Alıcılar     : ${pers ? "SGK, vergi dairesi, mali müşavir" : c.id === "online" && a.hasAbroad ? p.abroad.map((x) => x.l).join(", ") + " (yurt dışı)" : S.alici}`;
      }).join("\n\n");
      return `KİŞİSEL VERİ İŞLEME ENVANTERİ (TASLAK)
${p.name} · ${today()}
VERBİS kaydı: ${a.req ? "ZORUNLU" : "Muaf (yine de envanter tutulması önerilir)"}

${rows}

Bu envanter VERBİS bildirimindeki "veri kategorisi, amaç, alıcı grubu, saklama süresi" alanlarına doğrudan aktarılabilir.`;
    }

    if (id === "riza") return `AÇIK RIZA METNİ
${p.name}

Aydınlatma metnini okudum. Aşağıda işaretlediğim konularda kişisel verilerimin işlenmesine özgür irademle onay veriyorum. Onay vermemem hâlinde ${S.s} hizmetlerinden yararlanmaya devam edebileceğimi biliyorum.

[ ] İletişim bilgilerimin kampanya, indirim ve yeni ürün duyuruları için kullanılmasına (SMS / e-posta / WhatsApp).
[ ] Alışveriş geçmişime göre bana özel öneriler sunulmasına.${a.hasAbroad ? `
[ ] Verilerimin ${p.abroad.map((x) => x.l).join(", ")} hizmetleri aracılığıyla yurt dışına aktarılmasına.` : ""}${a.hasSpecial ? "\n[ ] Sağlık / biyometrik verilerimin yalnızca hizmetin sunulması amacıyla işlenmesine." : ""}

Rızamı istediğim zaman ${contact} adresine yazarak geri alabilirim.

Ad Soyad: ______________   Tarih: ____ / ____ / ______   İmza: ______________

Not: Açık rıza, hizmet şartına bağlanamaz ve aydınlatma metniyle aynı onay kutusunda alınamaz.`;

    if (id === "ihlal") return `VERİ İHLALİ MÜDAHALE PLANI
${p.name}

0. SAAT — TESPİT
• İhlali fark eden çalışan, ${p.contact || "veri sorumlusu irtibat kişisine"} derhal haber verir.
• Etkilenen sistemler ağdan ayrılır, loglar korunur, parolalar sıfırlanır.

0-24. SAAT — DEĞERLENDİRME
• Hangi veri kategorileri etkilendi? (${cats.map((c) => c.l).join(", ")})
• Kaç kişi etkilendi, veri şifreli miydi, yurt dışı servis (${p.abroad.map((x) => x.l).join(", ") || "yok"}) dahil mi?

24-72. SAAT — KURUL BİLDİRİMİ
• KVKK md.12/5 uyarınca, ihlal öğrenildikten sonra en geç 72 saat içinde Kurum'un Veri İhlali Bildirim Formu ile Kurul'a bildirilir.
• Gecikme varsa gerekçesi forma eklenir.

MAKUL SÜREDE — İLGİLİ KİŞİLER
• Etkilenen kişilere ${p.channels.some((c) => c.id === "whatsapp") ? "SMS/e-posta ile" : "e-posta ile"} ve gerekirse sitede duyuru yapılır: ne oldu, hangi veriler, ne yapmalılar, iletişim.

SONRASI
• Kök neden analizi, tedbirlerin güncellenmesi, ihlal kayıt defterine işlenmesi.`;
    return "";
  }

  const RULES = [
    { t: "Veri sorumlusunun kimliği", h: "Unvan ve adres belirtilmeli", re: /(veri sorumlusu|unvan|ltd\.|şti\.|a\.ş\.)/i },
    { t: "İşleme amaçları", h: "Verilerin ne için işlendiği", re: /(amac|amaç|amacıyla|için işlen)/i },
    { t: "Hukuki sebep", h: "KVKK md.5/6 dayanağı", re: /(hukuki sebep|md\.?\s?5|madde\s?5|meşru menfaat|açık rıza|sözleşmenin)/i },
    { t: "Toplama yöntemi", h: "Hangi kanalla, otomatik mi", re: /(toplama yöntem|otomatik|kanal|aracılığıyla topla|yoluyla elde)/i },
    { t: "Aktarılan alıcı grupları", h: "Kime aktarıldığı", re: /(aktar|paylaş)/i },
    { t: "Yurt dışı aktarım", h: "Sunucu yurt dışındaysa belirtilmeli", re: /(yurt ?dışı|yurtdışı|standart sözleşme)/i },
    { t: "md.11 hakları", h: "İlgili kişinin hakları listelenmeli", re: /(md\.?\s?11|madde\s?11|haklarınız|düzeltilmesini|silinmesini)/i },
    { t: "Başvuru yolu", h: "Hakların nasıl kullanılacağı", re: /(başvur|talebiniz|30 gün)/i },
    { t: "Çerez bilgilendirmesi + rıza", h: "Zorunlu olmayan çerez için açık rıza", re: /(çerez[\s\S]*(rıza|onay|tercih)|(rıza|onay|tercih)[\s\S]*çerez)/i },
    { t: "KVKK / 6698 atfı", h: "Doğru mevzuata dayanma", re: /(kvkk|6698|kişisel verilerin korunması)/i },
  ];
  const audit = (text) => RULES.map((r) => ({ t: r.t, h: r.h, ok: r.re.test(text) }));

  const SAMPLE = {
    id: "ornek", name: "Liman Kahve Kavurma Ltd. Şti. (örnek)", sector: "eticaret", city: "Samsun", address: "Atakum, Samsun",
    contact: "kvkk@limankahve.com.tr", emp: 34, bal: 62, bilanco: true, mainSpecial: false,
    cats: ["kimlik", "iletisim", "finans", "musteri", "pazarlama", "online", "personel"],
    channels: ["web", "magaza", "whatsapp"], abroad: ["ga", "meta"],
    m: { aydinlatma: true, guvenlik: true }, created: Date.now(),
  };

  g.KVKK = { CATS, CHANNELS, ABROAD, MEASURES, SECTOR, FINES, DOCS, expand, analyze, gen, audit, verbisRequired, SAMPLE };
})(window);
