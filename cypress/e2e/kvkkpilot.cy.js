// KVKKpilot uçtan uca testleri. Demo videosundaki akışın Cypress karşılığıdır.
// Çalıştırma: npm run dev  (bir terminalde)  ·  npm run test:e2e  (diğerinde)

describe("Tanıtım sayfası", () => {
  beforeEach(() => cy.visit("/"));

  it("başlığı ve çağrı butonlarını gösterir", () => {
    cy.contains("h1", "KVKK uyumunuzu");
    cy.contains("a", "Ücretsiz analiz başlat").should("have.attr", "href", "/app#/yeni");
    cy.contains("a", "Örnek raporu gör");
  });

  it("VERBİS hızlı testi eşiğe göre sonucu değiştirir", () => {
    cy.get("#qRes b").should("have.text", "Hayır, muafsınız");
    cy.get("#qEmp").clear().type("60");
    cy.get("#qRes b").should("have.text", "Evet, kayıt zorunlu");
    cy.get("#qEmp").clear().type("8");
    cy.get("#qSp").check();
    cy.get("#qBal").clear().type("12");
    cy.get("#qRes b").should("have.text", "Evet, kayıt zorunlu"); // özel nitelikli veri: 10 mn ₺ eşiği
  });
});

describe("Uygulama", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.intercept("GET", "/api/ai", { ai: false, provider: null });
  });

  it("örnek firmanın raporunu doğru hesaplar", () => {
    cy.visit("/app#/i/ornek");
    cy.get(".gauge b").should("have.text", "35");
    cy.contains(".stat", "VERBİS kaydı").contains("Muaf");
    cy.contains(".stat", "Ceza riski").contains("18.898.619 ₺");
  });

  it("eylemi tamamlayınca skor yükselir", () => {
    cy.visit("/app#/i/ornek");
    cy.get("[data-done=sozlesme]").click();
    cy.get(".gauge b").should("have.text", "47");
  });

  it("çalışan sayısı 60 olunca VERBİS zorunlu olur", () => {
    cy.visit("/app#/duzenle/ornek");
    cy.get("form#wf button[type=submit]").click();
    cy.get("#w-emp").clear().type("60");
    for (let i = 0; i < 4; i++) cy.get("form#wf button[type=submit]").click();
    cy.contains(".stat", "VERBİS kaydı").contains("Zorunlu");
    cy.get(".actions li").first().contains("VERBİS'e kaydolun");
  });

  it("belgeleri işletme bilgileriyle üretir", () => {
    cy.visit("/app#/i/ornek/belgeler");
    cy.get("#dv").should("contain", "Liman Kahve Kavurma").and("contain", "Google Analytics");
    cy.contains("#dt button", "Veri envanteri").click();
    cy.get("#dv").should("contain", "KİŞİSEL VERİ İŞLEME ENVANTERİ");
  });

  it("metin denetimi eksik unsurları bulur", () => {
    cy.visit("/app#/i/ornek/denetim");
    cy.get("#run").click();
    cy.get("#asc").should("contain", "1/10");
    cy.get("#mine").click();
    cy.get("#asc").should("contain", "10/10");
  });

  it("sihirbazla yeni işletme ekler", () => {
    cy.visit("/app#/yeni");
    cy.get("#w-name").type("Şifa Diş Polikliniği");
    cy.get("#w-sector").select("saglik");
    cy.get("form#wf button[type=submit]").click();
    cy.get("#w-emp").clear().type("8");
    cy.get("#w-bal").clear().type("6");
    cy.get("#w-sp").check();
    cy.get("form#wf button[type=submit]").click();
    cy.get("input[value=saglik] + span").click();
    cy.get("form#wf button[type=submit]").click();
    cy.get("form#wf button[type=submit]").click();
    cy.get("form#wf button[type=submit]").click();
    cy.contains("h1", "Şifa Diş Polikliniği");
    cy.contains(".actions", "Özel nitelikli veri");
    cy.visit("/app#/");
    cy.get(".bizcard").should("have.length", 3); // örnek + klinik + "yeni ekle" kartı
  });
});
