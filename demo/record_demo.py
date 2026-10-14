"""KVKKpilot demo videosu: ekran yazılı, imleçli otomatik tur (Playwright).
Kullanım: python demo/serve.py . 8790 &  ve ardından  python demo/record_demo.py demo/video
"""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8790"
OUT = sys.argv[1]
W, H = 1600, 900

OVERLAY_JS = r"""
(() => {
  if (document.getElementById('__demo')) return;
  const st = document.createElement('style');
  st.textContent = `
  #__cap{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);max-width:1180px;z-index:99999;
    background:rgba(19,35,58,.94);color:#fff;font:600 23px/1.4 Inter,"Segoe UI",system-ui,sans-serif;
    padding:16px 26px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35);text-align:center;
    transition:opacity .35s ease;opacity:0;pointer-events:none;border-left:6px solid #C0322B}
  #__cap small{display:block;font-weight:500;font-size:17px;opacity:.85;margin-top:4px}
  #__cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:100000;pointer-events:none;
    transition:transform .7s cubic-bezier(.4,0,.2,1);transform:translate(800px,450px)}
  #__cur svg{width:26px;height:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
  #__cur.click::after{content:"";position:absolute;left:-14px;top:-14px;width:40px;height:40px;border-radius:50%;
    border:3px solid #C0322B;animation:__p .5s ease-out}
  @keyframes __p{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  #__card{position:fixed;inset:0;z-index:100001;background:#13233A;color:#F5F7F8;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:22px;text-align:center;font-family:Inter,system-ui,sans-serif;
    transition:opacity .5s ease}
  #__card .s{width:120px;height:120px;border-radius:50%;border:5px solid #F0736B;color:#F0736B;display:grid;place-items:center;
    font:600 22px/1.15 "DejaVu Sans Mono",monospace;transform:rotate(-8deg)}
  #__card h1{font:800 86px/1 Inter,system-ui,sans-serif;letter-spacing:-2px;margin:0}
  #__card h1 span{color:#F0736B}
  #__card p{font:500 30px/1.4 Inter,system-ui,sans-serif;color:#C9D4E2;margin:0;max-width:1100px}
  #__card .u{font:600 26px/1 "DejaVu Sans Mono",monospace;color:#F0736B;margin-top:10px}`;
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = '__demo';
  d.innerHTML = '<div id="__cap"></div><div id="__cur"><svg viewBox="0 0 24 24"><path d="M4 2l16 9-7 1.6L9.6 20z" fill="#fff" stroke="#13233A" stroke-width="1.6" stroke-linejoin="round"/></svg></div>';
  document.body.appendChild(d);
  const pos = sessionStorage.getItem('__curpos');
  if (pos) document.getElementById('__cur').style.transform = pos;
})();
"""


class Demo:
    def __init__(self, page):
        self.p = page

    async def ensure(self):
        await self.p.evaluate(OVERLAY_JS)

    async def wait(self, s):
        await self.p.wait_for_timeout(int(s * 1000))

    async def cap(self, text, sub="", hold=0):
        await self.ensure()
        await self.p.evaluate(
            """([t,s]) => { const c=document.getElementById('__cap'); c.style.opacity=0;
               setTimeout(()=>{ c.innerHTML=''; c.append(t); if(s){const m=document.createElement('small'); m.textContent=s; c.append(m);} c.style.opacity=1; },250); }""",
            [text, sub],
        )
        await self.wait(0.4 + hold)

    async def hide_cap(self):
        await self.p.evaluate("()=>{const c=document.getElementById('__cap'); if(c) c.style.opacity=0;}")

    async def card(self, title_html, sub, url="", hold=4):
        await self.ensure()
        await self.p.evaluate(
            """([h,s,u]) => { let c=document.getElementById('__card'); if(!c){c=document.createElement('div');c.id='__card';document.body.appendChild(c);}
               c.style.opacity=1; c.innerHTML='<div class="s">KVKK<br>6698</div><h1>'+h+'</h1><p></p>'+(u?'<div class="u"></div>':'');
               c.querySelector('p').textContent=s; if(u) c.querySelector('.u').textContent=u; }""",
            [title_html, sub, url],
        )
        await self.wait(hold)

    async def uncard(self):
        await self.p.evaluate("()=>{const c=document.getElementById('__card'); if(c){c.style.opacity=0; setTimeout(()=>c.remove(),500);}}")
        await self.wait(0.6)

    async def move(self, sel, nth=0):
        await self.ensure()
        loc = self.p.locator(sel).nth(nth)
        await loc.scroll_into_view_if_needed()
        await self.wait(0.3)
        b = await loc.bounding_box()
        x, y = b["x"] + min(b["width"] / 2, 60), b["y"] + b["height"] / 2
        t = f"translate({x - 4:.0f}px,{y - 2:.0f}px)"
        await self.p.evaluate("(t)=>{const c=document.getElementById('__cur'); c.style.transform=t; sessionStorage.setItem('__curpos',t);}", t)
        await self.wait(0.8)
        return loc

    async def click(self, sel, nth=0, after=0.9):
        loc = await self.move(sel, nth)
        await self.p.evaluate("()=>{const c=document.getElementById('__cur'); c.classList.remove('click'); void c.offsetWidth; c.classList.add('click');}")
        await self.wait(0.25)
        await loc.click()
        await self.wait(after)

    async def type(self, sel, text):
        loc = await self.move(sel)
        await loc.click()
        await loc.fill("")
        await loc.type(text, delay=70)
        await self.wait(0.4)

    async def scroll_to(self, sel, offset=-90):
        await self.p.evaluate(
            """([s,o])=>{const e=document.querySelector(s); if(e) window.scrollTo({top:e.getBoundingClientRect().top+scrollY+o,behavior:'smooth'});}""",
            [sel, offset],
        )
        await self.wait(1.1)

    async def scroll_by(self, dy):
        await self.p.evaluate("(d)=>window.scrollBy({top:d,behavior:'smooth'})", dy)
        await self.wait(1.0)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(
            viewport={"width": W, "height": H},
            record_video_dir=OUT,
            record_video_size={"width": W, "height": H},
            locale="tr-TR",
            accept_downloads=True,
        )
        page = await ctx.new_page()
        page.on("pageerror", lambda e: print("PAGE ERROR:", e))
        d = Demo(page)

        # 0. Açılış kartı
        await page.goto(BASE + "/")
        await page.wait_for_load_state("networkidle")
        await d.card('KVKK<span>pilot</span>', "KOBİ'ler için yapay zekâ destekli KVKK uyum ajanı", "Y Combinator RFS 2026 · AI-Native Compliance", hold=4.5)
        await d.card('Problem', "3,93 milyon KOBİ kişisel veri işliyor. 2026'da tek bir KVKK ihlalinin cezası 17,1 milyon ₺'ye kadar çıkıyor.", hold=5)
        await d.uncard()

        # 1. Tanıtım sayfası
        await d.cap("Tanıtım sayfası: ürün tek cümlede ne yaptığını söylüyor", "Kayıt gerektirmez, veriler kullanıcının tarayıcısında kalır", hold=3)
        await d.cap("Hızlı test: VERBİS'e kaydolmak zorunda mısınız?", "Kurul'un 2025/2393 sayılı kararındaki eşiklere göre anında hesaplanır", hold=1.5)
        await d.type("#qEmp", "60")
        await d.wait(1.5)
        await d.cap("60 çalışanla eşik aşıldı: kayıt zorunlu", "Ceza aralığı 2026 tutarlarıyla gösteriliyor", hold=2.5)
        await d.type("#qEmp", "34")
        await d.wait(1.2)
        await d.scroll_to("#ozellikler")
        await d.cap("Dört modül: rapor, ceza riski, hazır belgeler, yapay zekâ", hold=3.5)
        await d.scroll_to(".compare", -200)
        await d.cap("Fark: Vanta ve Termly GDPR için yapıldı, KVKKpilot KVKK için", "VERBİS, ₺ ceza, KVKK standart sözleşmesi ve Türkçe sektörel belgeler", hold=4)
        await d.scroll_to("#fiyatlar")
        await d.cap("İş modeli: ücretsiz rapor, aylık Pro ve mali müşavir paneli", hold=3.5)
        await page.evaluate("window.scrollTo({top:0,behavior:'smooth'})")
        await d.wait(1.2)

        # 2. Örnek rapor
        await d.cap("Örnek firma: Samsun'da 34 çalışanlı bir kahve e-ticaret şirketi", hold=1.2)
        await d.click("a:has-text('Örnek raporu gör')", after=1.8)
        await d.cap("Uyum skoru 35/100: ciddi uyum açığı", "VERBİS'ten muaf, ama ceza riski 18,9 milyon ₺", hold=4)
        await d.scroll_to(".actions", -160)
        await d.cap("Eylem planı: önem sırasına göre, kanun maddesiyle", "Kırmızı = doğrudan ceza riski taşıyan eksikler", hold=4)
        await d.cap("Google Analytics ve Meta Pixel yurt dışına veri aktarıyor", "Standart sözleşmeyi imzalayıp \"Tamamlandı\" diyelim", hold=1.5)
        await d.click("[data-done=sozlesme]", after=0.8)
        await page.evaluate("window.scrollTo({top:0,behavior:'smooth'})")
        await d.wait(1)
        await d.cap("Skor 35'ten 47'ye çıktı, ceza riski düştü", hold=3.5)
        await d.scroll_to("table", -200)
        await d.cap("2026 ceza tablosu: KVKK md.18, yeniden değerleme oranı %25,49", hold=4)

        # 3. Büyüme senaryosu: VERBİS zorunlu hale gelsin
        await page.evaluate("window.scrollTo({top:0,behavior:'smooth'})")
        await d.wait(1)
        await d.cap("Şirket büyüdü: çalışan sayısını 60'a çıkaralım", hold=1)
        await d.click("a:has-text('Bilgileri düzenle')", after=1.2)
        await d.click("button[type=submit]", after=1)
        await d.type("#w-emp", "60")
        await d.wait(0.6)
        for _ in range(4):
            await d.click("form#wf button[type=submit]", after=0.9)
        await d.wait(1)
        await d.cap("VERBİS kaydı artık zorunlu ve eylem planının en üstünde", "Kayıt yapılmazsa 341.809 ₺ ile 17.092.242 ₺ arası ceza", hold=4.5)

        # 4. Belgeler
        await d.click(".tabs a:has-text('Belgeler')", after=1.5)
        await d.cap("Firmaya özel aydınlatma metni otomatik üretildi", "Unvan, veri türleri, kanallar ve yurt dışı servisler işletme bilgilerinden geliyor", hold=4)
        await page.evaluate("document.querySelector('#dv').scrollTo({top:700,behavior:'smooth'})")
        await d.wait(2)
        await d.click("#dt button:has-text('Çerez politikası')", after=1)
        await d.cap("Çerez politikası: Analytics ve Pixel için açık rıza maddesi eklendi", hold=3)
        await d.click("#dt button:has-text('Veri envanteri')", after=1)
        await d.cap("Veri envanteri: VERBİS formuna doğrudan aktarılabilir", "Her veri kategorisi için amaç, hukuki sebep, saklama süresi ve alıcılar", hold=3.5)
        await d.click("#word", after=1.2)
        await d.cap("Tek tıkla Word veya PDF olarak indiriliyor", hold=2.5)

        # 5. Metin denetimi
        await d.click(".tabs a:has-text('Metin denetimi')", after=1.2)
        await d.cap("Metin denetimi: firmanın sitedeki mevcut gizlilik metni", hold=2)
        await d.click("#run", after=0.8)
        await d.scroll_to("#ac", -220)
        await d.cap("KVKK md.10'un istediği 10 unsurdan yalnızca 1'i var", "Veri sorumlusu, hukuki sebep, haklar ve başvuru yolu eksik", hold=4.5)
        await page.evaluate("window.scrollTo({top:0,behavior:'smooth'})")
        await d.wait(0.8)
        await d.click("#mine", after=0.8)
        await d.scroll_to("#ac", -220)
        await d.cap("KVKKpilot'un ürettiği metin: 10 unsurun 10'u tamam", hold=4)

        # 6. Yeni işletme
        await page.evaluate("window.scrollTo({top:0,behavior:'smooth'})")
        await d.wait(0.8)
        await d.cap("Yeni işletme: 5 adımlı sihirbaz", "Örnek: 8 çalışanlı bir diş kliniği", hold=1)
        await d.click(".navlinks a:has-text('Yeni analiz')", after=1)
        await d.type("#w-name", "Şifa Ağız ve Diş Sağlığı Polikliniği")
        await page.select_option("#w-sector", "saglik")
        await d.type("#w-city", "Samsun")
        await d.type("#w-contact", "kvkk@sifadis.com.tr")
        await d.click("form#wf button[type=submit]", after=0.9)
        await d.type("#w-emp", "8")
        await d.type("#w-bal", "6")
        await d.click("#w-sp", after=0.6)
        await d.cap("Ana faaliyeti sağlık verisi: eşikler 10 çalışan / 10 milyon ₺'ye düşer", hold=2.5)
        await d.click("form#wf button[type=submit]", after=0.9)
        await d.click("input[value=saglik] + span", after=0.5)
        await d.click("input[value=gorsel] + span", after=0.5)
        await d.click("form#wf button[type=submit]", after=0.9)
        await d.click("input[value=telefon] + span", after=0.5)
        await d.click("form#wf button[type=submit]", after=0.9)
        await d.click("input[name=m][value=aydinlatma]", after=0.5)
        await d.click("form#wf button[type=submit]", after=1.5)
        await d.cap("Klinik VERBİS'ten muaf, ama sağlık verisi için ek yükümlülükler var", "Eylem planı sektöre ve veri türüne göre değişiyor", hold=4.5)
        await d.click(".navlinks a:has-text('İşletmelerim')", after=1.2)
        await d.cap("İşletmelerim panosu: her firmanın skoru, VERBİS durumu ve riski tek bakışta", "Mali müşavirler için çoklu müşteri yönetimi", hold=4.5)
        await d.hide_cap()

        # 7. Kapanış
        await d.card('KVKK<span>pilot</span>', "Klon: Vanta çekirdeği · Yerel: KVKK, VERBİS, ₺ cezalar · Yeni: yapay zekâ denetim ve asistan", "kvkkpilot-blush.vercel.app", hold=6)

        await ctx.close()
        await browser.close()


asyncio.run(main())
