/**
 * Uçtan uca smoke testi - build edilmiş siteyi (.output) Nitro sunucusuyla açar,
 * gerçek Chrome'da içerik/SEO/etkileşim assert'leri koşar.
 *
 * Kullanım: npm run build && npm run smoke
 * Ortam: CHROME_PATH (CI: /usr/bin/google-chrome), SHOT_DIR (ekran görüntüsü klasörü, ops.)
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const PORT = 4310
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(join(root, '.output/server/index.mjs'))) {
  console.error('.output yok - önce `npm run build` çalıştır.')
  process.exit(1)
}

const server = spawn('node', ['.output/server/index.mjs'], {
  cwd: root,
  stdio: 'ignore',
  env: {
    ...process.env,
    PORT: String(PORT),
    NITRO_PORT: String(PORT),
    // "Afi'ye sor" paneli boş URL'de hiç render edilmez; smoke'ta sahte akışla
    // açıyoruz ki bölüm ve etkileşim gerçekten test edilsin.
    NUXT_PUBLIC_ASK_API_URL: 'mock',
  },
})

const ok = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

let browser
try {
  for (let i = 0; ; i++) {
    try {
      await fetch(`http://localhost:${PORT}/`)
      break
    } catch {
      if (i > 50) throw new Error('Nitro sunucusu açılmadı')
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  // --- Prerender/SEO: JS çalışmadan da içerik HTML'de olmalı ---
  const html = await (await fetch(`http://localhost:${PORT}/`)).text()
  ok(html.includes('lang="tr"'), 'html lang="tr"')
  ok(html.includes('Sayma,') && html.includes('dengele.'), 'hero metni prerender HTML içinde')
  ok(html.includes('og:image'), 'og:image meta mevcut')
  ok(html.includes('Çünkü sofra sayı saymaz.'), 'zag bölümü prerender HTML içinde')

  // --- Beta başvuru ucu EMEKLİ (24 Ağu 2026) ---
  // Uygulama App Store'da yayına girdi, beta kapandı. Uç kaldırıldı ama
  // `beta_applications` tablosu arşiv olarak duruyor; test ucun geri
  // sızmadığını korur (silinmiş bir toplama ucunun sessizce dönmesi, rıza
  // metni olmadan e-posta toplamak demektir).
  const eskiBasvuru = await fetch(`http://localhost:${PORT}/api/beta/apply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'smoke@afiet.co', consent: true }),
  })
  ok(eskiBasvuru.status === 404, `beta başvuru ucu kaldırıldı → 404 (${eskiBasvuru.status})`)

  // --- SEO & GEO yüzeyi (DB'siz ortamda kod varsayılanlarıyla çalışmalı) ---
  const robots = await (await fetch(`http://localhost:${PORT}/robots.txt`)).text()
  ok(robots.includes('Sitemap:'), 'robots.txt Sitemap satırı içeriyor')
  ok(robots.includes('Bytespider'), 'robots.txt Bytespider engeli içeriyor')

  const sitemapRes = await fetch(`http://localhost:${PORT}/sitemap.xml`)
  const sitemap = await sitemapRes.text()
  ok(
    (sitemapRes.headers.get('content-type') || '').includes('xml') &&
      sitemap.includes('<urlset') &&
      (sitemap.match(/<loc>/g) || []).length >= 3,
    'sitemap.xml gerçek XML ve ≥3 sayfa listeliyor',
  )

  const llms = await (await fetch(`http://localhost:${PORT}/llms.txt`)).text()
  ok(llms.startsWith('# afiet'), 'llms.txt yayında')
  /* llms.txt'in `>` özeti = tek cümlelik marka tanımının kendisi. Bu dosya
     üretken motorların okuduğu asıl yüzey; buraya cümlenin elle yazılmış bir
     kopyası konursa tanım değiştiğinde sessizce eskir (11 Ağu 2026'ya kadar
     eskimişti de). Kopya değil, `#shared/utils/marka`dan gelen cümle aranır. */
  ok(
    llms.includes('> afiet, kalori saydırmadan Türk sofrasının kendi ölçüleriyle (dilim, kase, avuç)'),
    'llms.txt özeti sabitlenmiş marka tanımını basıyor',
  )
  ok(llms.includes('](https://afiet.co/basin)'), 'llms.txt basın kitine bağlantı veriyor')

  const missing = await fetch(`http://localhost:${PORT}/olmayan-sayfa-smoke`)
  ok(missing.status === 404, `bilinmeyen yol gerçek 404 (${missing.status})`)

  /* Global robots meta: üç direktif de bir SINIRI kaldırır ve açıkça
     verilmezse motor kendi sınırını uygular (alıntılanabilir metnin uzunluğu
     buna bakar). Sayfa bazlı override yine panelden gelir, o yüzden bu satır
     yalnız varsayılan yolda beklenir. */
  ok(
    html.includes('max-snippet:-1') &&
      html.includes('max-image-preview:large') &&
      html.includes('max-video-preview:-1'),
    'robots meta üç önizleme direktifini de veriyor',
  )
  const noindexHtml = await (await fetch(`http://localhost:${PORT}/bulten/onay`)).text()
  ok(
    noindexHtml.includes('noindex') && !noindexHtml.includes('max-snippet'),
    'sayfa override’ı (noindex) global direktifle KARIŞMIYOR',
  )

  // --- Yazar sayfası (/hakkinda) ve Person kimliği ---
  const authorRes = await fetch(`http://localhost:${PORT}/hakkinda`)
  const authorHtml = await authorRes.text()
  ok(authorRes.status === 200, `/hakkinda 200 (${authorRes.status})`)
  ok(authorHtml.includes('Berk Karataş'), '/hakkinda yazarın adını gösteriyor')
  ok(authorHtml.includes('ProfilePage'), '/hakkinda ProfilePage şeması içeriyor')
  ok(authorHtml.includes('#yazar'), 'Person düğümü sabit @id taşıyor')
  ok(sitemap.includes('/hakkinda'), 'sitemap /hakkinda sayfasını içeriyor')

  const aboutEnRes = await fetch(`http://localhost:${PORT}/en/about`)
  const aboutEnHtml = await aboutEnRes.text()
  ok(aboutEnRes.status === 200, `/en/about 200 (${aboutEnRes.status})`)
  ok(aboutEnHtml.includes('hreflang="tr"'), '/en/about Türkçe eşine hreflang veriyor')
  ok(
    aboutEnHtml.includes('founder of afiet') && aboutEnHtml.includes('/hakkinda#yazar'),
    'İngilizce sayfa İngilizce unvan basıyor ama kimlik (@id) aynı kalıyor',
  )

  /* --- Basın kiti (/basin + /en/press) ---
     İki tuzağı birden bekler:
     1. `public/basin-kiti/` klasörü sayfayla AYNI adı taşısaydı statik sunucu
        /basin isteğini dizine 301'lerdi; 200 beklemek bunu yakalar.
     2. Sayfadaki tek cümlelik tanım `shared/utils/marka.ts`ten gelir. Kopyası
        çıkarılırsa metin ayrışır, bu yüzden cümlenin kendisi aranır. */
  const basinRes = await fetch(`http://localhost:${PORT}/basin`, { redirect: 'manual' })
  const basinHtml = await basinRes.text()
  ok(basinRes.status === 200, `/basin 200, yönlendirme yok (${basinRes.status})`)
  ok(
    basinHtml.includes('ailelerin dengeli beslenme alışkanlığı kurmasına'),
    '/basin tek cümlelik marka tanımını basıyor',
  )
  ok(basinHtml.includes('Berk Karataş'), '/basin kurucu künyesini gösteriyor')
  ok(sitemap.includes('/basin'), 'sitemap /basin sayfasını içeriyor')

  const kitRes = await fetch(`http://localhost:${PORT}/basin-kiti/afiet-basin-kiti.zip`)
  ok(kitRes.status === 200, `basın kiti arşivi indirilebiliyor (${kitRes.status})`)

  ok(basinHtml.includes('"@type":"AboutPage"'), '/basin AboutPage şeması içeriyor')
  /* Basın sayfasındaki kurum, ana sayfadakiyle AYNI varlık olmak zorunda:
     paylaşılan `@id` düşerse motorlar iki ayrı afiet görür. Kurucu bağı da
     aynı sebeple aranır - şema kurum ↔ kişi bağını taşımazsa basın kiti
     "bunu kim yapıyor" sorusunu makine tarafında yine cevapsız bırakır. */
  ok(basinHtml.includes('/#organization'), '/basin kurumun paylaşılan @id\'sini taşıyor')
  ok(basinHtml.includes('"founder"') && basinHtml.includes('#yazar'), '/basin kurucuyu Person kimliğine bağlıyor')

  /* --- Kullanım Koşulları (/kosullar) ---
     Bu sayfanın 200 dönmesi bir SEO tercihi değil, gönderim şartı: mobildeki
     paywall doğrudan buraya bağlanır ve App Store 3.1.2 bağlantıyı hem
     uygulamada hem mağaza kaydında arar, 404 red sebebidir. Sayfa bir kez
     yayına girdikten sonra yolu da değişemez, çünkü mağazadaki build eski
     adresi taşımaya devam eder.

     Sağlık uyarısı ve abonelik bölümü ayrıca aranır: ikisi de metnin
     kaldırılması en kolay, kaldırılınca en pahalı parçaları. */
  const kosullarRes = await fetch(`http://localhost:${PORT}/kosullar`, { redirect: 'manual' })
  const kosullarHtml = await kosullarRes.text()
  ok(kosullarRes.status === 200, `/kosullar 200, yönlendirme yok (${kosullarRes.status})`)
  ok(
    kosullarHtml.includes('bir sağlık hizmeti değildir'),
    '/kosullar sağlık uyarısını basıyor',
  )
  ok(kosullarHtml.includes('afiet+ aboneliği'), '/kosullar abonelik bölümünü basıyor')
  ok(
    kosullarHtml.includes('en az 24 saat önce iptal etmezsen kendiliğinden yenilenir'),
    '/kosullar otomatik yenilemeyi 24 saat kuralıyla söylüyor',
  )
  ok(
    kosullarHtml.includes('İptali uygulamanın içinden yapamazsın'),
    '/kosullar iptalin mağazadan yapıldığını söylüyor',
  )
  ok(kosullarHtml.includes('Cayma hakkı'), '/kosullar cayma hakkı bölümünü taşıyor')
  /* Korumalı unvan kuralı ASİSTANLAR içindir: satılan şeyi "psikolog" diye
     anlatmak yasak, kullanıcıyı gerçek bir diyetisyene yönlendirmek ise tam
     tersine istenen şey. Bu yüzden aranan, asistanların uygulamadaki adlarıyla
     anılması ve "psikolog" kelimesinin hiç geçmemesidir. */
  ok(!kosullarHtml.includes('psikolog'), '/kosullar korumalı unvanla satış yapmıyor')
  ok(
    kosullarHtml.includes('beslenme uzmanı') && kosullarHtml.includes('destek uzmanı'),
    '/kosullar asistanları uygulamadaki adlarıyla anıyor',
  )
  ok(sitemap.includes('/kosullar'), 'sitemap /kosullar sayfasını içeriyor')

  const pressEnRes = await fetch(`http://localhost:${PORT}/en/press`)
  const pressEnHtml = await pressEnRes.text()
  ok(pressEnRes.status === 200, `/en/press 200 (${pressEnRes.status})`)
  ok(
    pressEnHtml.includes('hreflang="tr"') && pressEnHtml.includes('/basin'),
    '/en/press Türkçe eşine hreflang veriyor',
  )
  ok(pressEnHtml.includes('"@type":"AboutPage"'), '/en/press AboutPage şeması içeriyor')
  ok(
    pressEnHtml.includes('afiet is a mobile app that helps families'),
    '/en/press kurum açıklamasını İngilizce marka tanımından basıyor',
  )

  // --- Blog yüzeyi (DB'siz ortamda boş liste; statüler yine tutarlı olmalı) ---
  const blogRes = await fetch(`http://localhost:${PORT}/blog`)
  const blogHtml = await blogRes.text()
  ok(
    blogRes.status === 200 && blogHtml.includes('Sofradan notlar'),
    `/blog 200 ve liste sayfası render oluyor (${blogRes.status})`,
  )
  ok(blogHtml.includes('rel="canonical"'), '/blog canonical içeriyor')

  const indirRes = await fetch(`http://localhost:${PORT}/indir`)
  const indirHtml = await indirRes.text()
  ok(
    indirRes.status === 200 &&
      indirHtml.includes('afiet’i indir') &&
      indirHtml.includes('App Store'),
    `/indir 200 ve indirme metni render oluyor (${indirRes.status})`,
  )
  ok(indirHtml.includes('rel="canonical"'), '/indir canonical içeriyor')

  /* Kod varsayılanı yönlendirmeler (seoDefaults > DEFAULT_REDIRECTS).
     Panelde SATIR YOKKEN de çalışmalılar - dev/staging'de `seo_redirects`
     boştur ve bu testin koştuğu ortam da öyle. Üç örnek üç ayrı taşıma
     biçimini temsil eder: sayfa, kategori ve silinmiş yazı. */
  for (const [from, to] of [
    ['/beta', '/indir'],
    ['/destek/beta-sorun-giderme', '/destek/sorun-giderme'],
    ['/destek/beta-sorun-giderme/testflight-guncelleme', '/destek/sorun-giderme/uygulamayi-guncellemek'],
    ['/destek/beta-sorun-giderme/beta-nasil-isliyor', '/indir'],
    ['/destek/baslangic/beta-davetiyle-kurulum', '/destek/baslangic/afieti-indirmek'],
  ]) {
    const r = await fetch(`http://localhost:${PORT}${from}`, { redirect: 'manual' })
    ok(
      r.status === 301 && r.headers.get('location') === to,
      `${from} → ${to} 301 (${r.status} → ${r.headers.get('location')})`,
    )
  }

  const blogApi = await fetch(`http://localhost:${PORT}/api/blog/posts`)
  const blogApiBody = await blogApi.json().catch(() => null)
  ok(
    blogApi.status === 200 && Array.isArray(blogApiBody?.posts),
    `/api/blog/posts 200 + dizi (${blogApiBody?.posts?.length ?? '-'} yazı)`,
  )

  const missingPost = await fetch(`http://localhost:${PORT}/blog/olmayan-yazi-smoke`)
  ok(missingPost.status === 404, `bilinmeyen yazı gerçek 404 (${missingPost.status})`)

  const rssRes = await fetch(`http://localhost:${PORT}/blog/rss.xml`)
  const rss = await rssRes.text()
  ok(
    (rssRes.headers.get('content-type') || '').includes('xml') && rss.includes('<rss'),
    'blog RSS yayında ve XML',
  )
  ok(sitemap.includes('/blog'), 'sitemap /blog sayfasını içeriyor')
  ok(sitemap.includes('/indir'), 'sitemap /indir sayfasını içeriyor')
  ok(!sitemap.includes('/beta'), 'sitemap artık /beta içermiyor')

  /* --- Gizlilik politikası: uygulamanın gerçekten yaptığı şeyler ---
     Bu dört bölüm bir üslup tercihi değil, uygulamanın canlı veri akışlarının
     karşılığı. Mağaza incelemesi politikayı uygulamanın davranışıyla
     karşılaştırır ve eksik beyan bilinen bir red sebebi. Bölümler metin
     düzenlemesi sırasında sessizce düşebildiği için tek tek aranıyor. */
  const gizlilikRes = await fetch(`http://localhost:${PORT}/gizlilik`)
  const gizlilikHtml = await gizlilikRes.text()
  ok(gizlilikRes.status === 200, `/gizlilik 200 (${gizlilikRes.status})`)
  ok(gizlilikHtml.includes('Asistan sohbetleri'), '/gizlilik sohbet saklamayı anlatıyor')
  ok(
    gizlilikHtml.includes('açık rızanla saklanır'),
    '/gizlilik destek sohbetinin açık rızaya bağlı olduğunu söylüyor',
  )
  ok(gizlilikHtml.includes('Abonelik ve ödeme'), '/gizlilik abonelik verisini anlatıyor')
  ok(gizlilikHtml.includes('RevenueCat'), '/gizlilik abonelik işlemcisini adıyla söylüyor')
  ok(gizlilikHtml.includes('Gruplar ve sofra'), '/gizlilik grupta ne göründüğünü anlatıyor')
  ok(
    gizlilikHtml.includes('Senin için tutulan not'),
    '/gizlilik hakkında tutulan yapay zekâ notunu anlatıyor',
  )
  // Yürürlük tarihi kopyadan okunur, buraya sabitlenmez: sabit bir tarih her
  // politika güncellemesinde smoke'u düşürür ve asıl iddiayı (sayfa kaynaktaki
  // tarihi basıyor mu) sınamaz. Kaynağı content.ts'tir, gizlilik ve koşullar
  // aynı günde yürürlüğe girer.
  const effective = readFileSync(join(root, 'app/data/content.ts'), 'utf8').match(
    /effective:\s*'([^']+)'/,
  )?.[1]
  ok(Boolean(effective), 'kopyada yürürlük tarihi tanımlı')
  ok(
    gizlilikHtml.includes(effective),
    `/gizlilik kopyadaki yürürlük tarihini basıyor (${effective})`,
  )

  // --- Destek merkezi: sunucu tarafı sözleşmeleri ---
  const supportHub = await fetch(`http://localhost:${PORT}/destek`)
  const supportHtml = await supportHub.text()
  ok(supportHub.status === 200, `/destek 200 (${supportHub.status})`)
  ok(supportHtml.includes('Nasıl yardımcı olabiliriz?'), '/destek başlığı prerender HTML içinde')
  ok(supportHtml.includes('CollectionPage'), '/destek CollectionPage şeması içeriyor')

  const supportMap = await (await fetch(`http://localhost:${PORT}/api/destek`)).json()
  ok(
    Array.isArray(supportMap.categories) && supportMap.categories.length === 7,
    `destek 7 kategori döndürüyor (${supportMap.categories?.length})`,
  )
  ok(supportMap.total > 0, `destek yazısı var (${supportMap.total})`)
  ok(
    supportMap.categories.every((c) => c.articles.length > 0),
    'her kategoride en az bir yazı var',
  )

  const firstCategory = supportMap.categories[0]
  const firstArticle = firstCategory.articles[0]
  const articlePath = `/destek/${firstCategory.slug}/${firstArticle.slug}`
  const articleRes = await fetch(`http://localhost:${PORT}${articlePath}`)
  const articleHtml = await articleRes.text()
  ok(articleRes.status === 200, `${articlePath} 200 (${articleRes.status})`)
  ok(articleHtml.includes('destek-govde'), 'destek yazısının gövdesi HTML içinde')
  ok(articleHtml.includes('TechArticle'), 'destek yazısı TechArticle şeması içeriyor')
  ok(articleHtml.includes('BreadcrumbList'), 'destek yazısı BreadcrumbList içeriyor')
  // Yazar: şemadaki Person ile sayfadaki görünür künye AYNI kayıttan gelmeli
  // (shared/utils/author.ts). Biri kalırsa öteki yalan söyler.
  ok(articleHtml.includes('"@type":"Person"'), 'destek yazısı Person yazarı içeriyor')
  ok(
    articleHtml.includes('rel="author"') && articleHtml.includes('href="/hakkinda"'),
    'destek yazısında görünür yazar künyesi var ve yazar sayfasına bağlanıyor',
  )

  const category404 = await fetch(`http://localhost:${PORT}/destek/yok-boyle-bir-sey`)
  ok(category404.status === 404, `bilinmeyen destek başlığı 404 (${category404.status})`)
  const article404 = await fetch(`http://localhost:${PORT}/destek/${firstCategory.slug}/yok`)
  ok(article404.status === 404, `bilinmeyen destek yazısı 404 (${article404.status})`)

  const searchIndex = await (await fetch(`http://localhost:${PORT}/api/destek/arama`)).json()
  ok(
    Array.isArray(searchIndex.rows) && searchIndex.rows.length === supportMap.total,
    `arama dizini tüm yazıları içeriyor (${searchIndex.rows?.length})`,
  )

  ok(sitemap.includes('/destek'), 'sitemap /destek sayfasını içeriyor')
  ok(sitemap.includes(articlePath), 'sitemap destek yazısını içeriyor')
  ok(llms.includes('## Destek merkezi'), 'llms.txt destek bölümü içeriyor')

  // --- Sürüm notları (/yenilikler) ---
  // Uygulamadaki Yenilikler pop-up'ı bu adrese bağlanıyor: sayfa düşerse
  // mağazadaki her sürümün "Tüm değişiklikleri oku" bağlantısı boşa düşer.
  const releasesRes = await fetch(`http://localhost:${PORT}/yenilikler`)
  const releasesHtml = await releasesRes.text()
  ok(releasesRes.status === 200, `/yenilikler 200 (${releasesRes.status})`)
  ok(releasesHtml.includes('neler değişti'), '/yenilikler başlığı prerender HTML içinde')

  const releaseList = await (await fetch(`http://localhost:${PORT}/api/yenilikler`)).json()
  ok(releaseList.total > 0, `sürüm notu var (${releaseList.total})`)
  const newest = releaseList.releases?.[0]
  ok(Boolean(newest?.version && newest?.title), 'en yeni sürümün sürümü ve başlığı dolu')

  const releasePath = `/yenilikler/${newest.version}`
  const releaseRes = await fetch(`http://localhost:${PORT}${releasePath}`)
  const releaseHtml = await releaseRes.text()
  ok(releaseRes.status === 200, `${releasePath} 200 (${releaseRes.status})`)
  ok(releaseHtml.includes('surum-govde'), 'sürüm notunun gövdesi HTML içinde')
  ok(releaseHtml.includes('TechArticle'), 'sürüm notu TechArticle şeması içeriyor')
  // TODO'lu bir taslak yayına çıkmamalı: releaseStore onu atlar.
  ok(!releaseHtml.includes('TODO'), 'sürüm notunda doldurulmamış TODO kalmamış')

  const release404 = await fetch(`http://localhost:${PORT}/yenilikler/9.9.9`)
  const release404Html = await release404.text()
  ok(release404.status === 404, `bilinmeyen sürüm 404 (${release404.status})`)
  ok(
    release404Html.includes('bulamadık'),
    'bilinmeyen sürüm markalı hata yerine kendi cümlesini kuruyor',
  )

  /* Sürüm notu sayfaları sitemap'e GİRMEZ (kullanıcı kararı, 5 Eyl 2026;
     gerekçe: `server/utils/seoStore > SITEMAP_DISI`). Arama talebi sıfır olan
     9 adres, tarama talebi zaten günde ~1 sayfaya düşmüş bir sitede yer
     kaplıyordu. Sayfalar YAYINDA ve hub onlara link vermeye devam ediyor -
     iddia "listelenmiyor", "erişilemiyor" değil. */
  ok(!sitemap.includes(releasePath), 'sürüm notu sitemap’e GİRMİYOR')
  ok(
    sitemap.includes('<loc>https://afiet.co/yenilikler</loc>'),
    'sürüm notu HUB’ı sitemap’te duruyor',
  )
  ok(llms.includes('## Sürüm notları'), 'llms.txt sürüm bölümü içeriyor')

  // --- Hesaplama araçları ---
  const hesapHub = await fetch(`http://localhost:${PORT}/hesapla`)
  const hesapHubHtml = await hesapHub.text()
  ok(hesapHub.status === 200, `/hesapla 200 (${hesapHub.status})`)
  ok(
    hesapHubHtml.includes('Sana tabağını veriyoruz'),
    '/hesapla başlığı prerender HTML içinde',
  )
  // Hub şeması: sayfayı CollectionPage, içindekileri ItemList anlatır. Liste
  // SEO katmanının bildiği alt sayfalardan türer, o yüzden beş araç da orada
  // olmalı; sayı düşerse ya bir sayfa kayboldu ya da türetme bozuldu.
  ok(hesapHubHtml.includes('"@type":"CollectionPage"'), '/hesapla CollectionPage şeması içeriyor')
  ok(hesapHubHtml.includes('"@type":"ItemList"'), '/hesapla ItemList şeması içeriyor')
  ok(hesapHubHtml.includes('"numberOfItems":5'), '/hesapla listesinde beş araç var')
  ok(
    hesapHubHtml.includes('https://afiet.co/hesapla/gunluk-su'),
    '/hesapla listesi alt sayfalara mutlak adresle bağlanıyor',
  )

  const plateRes = await fetch(`http://localhost:${PORT}/hesapla/sofra-payin`)
  const plateHtml = await plateRes.text()
  ok(plateRes.status === 200, `/hesapla/sofra-payin 200 (${plateRes.status})`)
  ok(plateHtml.includes('Seni tanıyalım'), 'hesap formu prerender HTML içinde')
  // Doktrin (hedeflerim.md § 12): bir kilo hedefi ne sorulur ne gösterilir.
  // Kalıp bilerek dar: sayfa "Hedef kilo sormuyoruz" diyebilmeli, ama bir
  // kiloyu SUNAN iyelik biçimleri ("ideal kilonuz", "hedef kilon") geçmemeli.
  ok(
    !/(ideal|hedef)\s+kilo(n|nuz|nuz\b|:)/i.test(plateHtml),
    'hesap sayfası bir kilo hedefi SUNMUYOR',
  )
  ok(
    !/kaç haftada|kaç ayda|\bhaftada \d+\s*kilo/i.test(plateHtml),
    'hesap sayfasında süre vaadi YOK',
  )
  for (const arac of ['vucut-kitle-indeksi', 'gunluk-su', 'yag-orani', 'porsiyon-cevirici']) {
    const res = await fetch(`http://localhost:${PORT}/hesapla/${arac}`)
    const html = await res.text()
    ok(res.status === 200, `/hesapla/${arac} 200 (${res.status})`)
    // Doktrin her araçta geçerli: hiçbiri bir kilo hedefi sunmaz.
    ok(
      !/(ideal|hedef)\s+kilo(n|nuz|nuz\b|:)/i.test(html),
      `${arac} bir kilo hedefi SUNMUYOR`,
    )
  }
  // --- Hesaplama araçlarının uzun içeriği (content/hesapla/*.md) ---
  // NEDEN EŞİK VAR: bu beş adres sitenin en yüksek arama talebi olan sayfaları
  // ama hesap istemcide döndüğü için sunucudan yalnız 101-145 kelime çıkıyordu,
  // yani arama motoru boş sayfa görüyordu. İçerik eklendikten sonra 797-903
  // kelime. Eşik o eski hâle sessizce geri düşmeyi yakalar (içerik dosyası
  // silinir, serverAssets bağlantısı kopar, katlama JS'e taşınır); metnin
  // kalitesini ölçmez.
  const kelimeSay = (html) =>
    html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ').length

  for (const arac of [
    'vucut-kitle-indeksi',
    'gunluk-su',
    'yag-orani',
    'porsiyon-cevirici',
    'sofra-payin',
  ]) {
    const html = await (await fetch(`http://localhost:${PORT}/hesapla/${arac}`)).text()
    const kelime = kelimeSay(html)
    // Katlanır bölüm native <details>tir: içerik ilk HTML'de TAM olarak durur.
    // JS'e taşınırsa bu iddia düşer ve sebebi de budur.
    ok(html.includes('hesap-katlanir'), `${arac} uzun içeriği SSR HTML'inde`)
    ok(kelime > 600, `${arac} sunucudan dolu geliyor (${kelime} kelime)`)
    ok(html.includes('"@type":"WebApplication"'), `${arac} WebApplication şeması içeriyor`)
    // SSS ekranda görünen metinle AYNI kaynaktan gelir; şema varsa soru da vardır.
    ok(html.includes('"@type":"FAQPage"'), `${arac} FAQPage şeması içeriyor`)
    ok(html.includes('sik-sorulanlar'), `${arac} SSS bölümü sayfada görünüyor`)
  }

  const besinRes = await fetch(`http://localhost:${PORT}/veri/besinler.json`)
  const besinBody = await besinRes.json()
  ok(
    besinRes.status === 200 && besinBody.sayi > 1900,
    `besin dizini yayında (${besinBody.sayi ?? '-'} besin)`,
  )
  ok(sitemap.includes('/hesapla'), 'sitemap /hesapla sayfasını içeriyor')

  // --- İngilizce araçlar (/en/tools) ---
  // Aynı eşik aynı sebeple: hesap istemcide döner, uzun içerik olmazsa arama
  // motoru burada da boş sayfa görür. Ek olarak hreflang ÇİFTİ kontrol edilir:
  // tek yönlü hreflang Google tarafından yok sayılır, yani "iki dilde de var"
  // iddiası ancak iki uçta da alternate varsa doğrudur.
  for (const [enSlug, trPath] of [
    ['bmi-calculator', '/hesapla/vucut-kitle-indeksi'],
    ['daily-water-calculator', '/hesapla/gunluk-su'],
    ['body-fat-calculator', '/hesapla/yag-orani'],
    ['daily-portions-calculator', '/hesapla/sofra-payin'],
  ]) {
    const enPath = `/en/tools/${enSlug}`
    const html = await (await fetch(`http://localhost:${PORT}${enPath}`)).text()
    const kelime = kelimeSay(html)
    ok(html.includes('hesap-katlanir'), `${enSlug} uzun içeriği SSR HTML'inde`)
    ok(kelime > 600, `${enSlug} sunucudan dolu geliyor (${kelime} kelime)`)
    ok(html.includes('lang="en"'), `${enSlug} html lang="en"`)
    ok(html.includes('"@type":"FAQPage"'), `${enSlug} FAQPage şeması içeriyor`)
    ok(
      html.includes(`hreflang="tr" href="https://afiet.co${trPath}"`),
      `${enSlug} Türkçe karşılığına hreflang veriyor`,
    )
    const trHtml = await (await fetch(`http://localhost:${PORT}${trPath}`)).text()
    ok(
      trHtml.includes(`hreflang="en" href="https://afiet.co${enPath}"`),
      `${trPath} İngilizce karşılığına hreflang veriyor (çift yönlü)`,
    )
    /* İngilizce sayfalar sitemap'e GİRMEZ (aynı karar ve aynı gerekçe).
       Yukarıdaki çift yönlü hreflang iddiaları BOZULMADAN duruyor ve bu
       bilinçli: sayfanın kendi <link rel="alternate"> etiketleri ayrı yoldan
       (resolvePageMeta) basılıyor, çünkü dil sürümlerinin birbirinin kopyası
       sanılmaması listelenmekten bağımsız bir ihtiyaç. */
    ok(
      !sitemap.includes(`<loc>https://afiet.co${enPath}</loc>`),
      `sitemap ${enSlug} içermiyor`,
    )
  }
  // İngilizce hub aynı şemayı üretir ama listesi DÖRT araçtır: porsiyon
  // çevirici İngilizce'de yok, liste onu uydurmamalı.
  const enHubHtml = await (await fetch(`http://localhost:${PORT}/en/tools`)).text()
  ok(enHubHtml.includes('"@type":"CollectionPage"'), '/en/tools CollectionPage şeması içeriyor')
  ok(enHubHtml.includes('"numberOfItems":4'), '/en/tools listesinde dört araç var')

  // Porsiyon çevirici İngilizce'de BİLEREK yok (katalog Türkçe). Sessizce
  // açılırsa yarım çevrilmiş bir sayfa yayınlanmış olur.
  const enPorsiyon = await fetch(`http://localhost:${PORT}/en/tools/portion-converter`)
  ok(enPorsiyon.status === 404, `İngilizce porsiyon çevirici açılmamış (${enPorsiyon.status})`)

  // --- İngilizce blog: yazı YOKKEN görünmezlik ---
  // Smoke veritabanısız koşar, yani burası tam olarak "hiç İngilizce yazı yok"
  // hâlidir ve kural şudur: sayfa çalışır ama hiçbir yere bağlanmaz. Yazı
  // varken davranış (dil süzgeci, çift yönlü hreflang, yanlış dilde 404)
  // veritabanı gerektirdiği için geliştirme ortamında elle doğrulanır.
  const enBlogRes = await fetch(`http://localhost:${PORT}/en/blog`)
  const enBlogHtml = await enBlogRes.text()
  ok(enBlogRes.status === 200, `/en/blog açılıyor (${enBlogRes.status})`)
  ok(enBlogHtml.includes('lang="en"'), '/en/blog html lang="en"')
  ok(!sitemap.includes('<loc>https://afiet.co/en/blog</loc>'), 'boş /en/blog sitemap’e GİRMİYOR')
  ok(!enBlogHtml.includes('href="/en/blog"'), 'boş blog menüde/alt bilgide GÖRÜNMÜYOR')

  const enPosts = await (await fetch(`http://localhost:${PORT}/api/blog/posts?lang=en`)).json()
  ok(Array.isArray(enPosts.posts) && enPosts.posts.length === 0, 'İngilizce yazı listesi boş')

  const enRss = await fetch(`http://localhost:${PORT}/en/blog/rss.xml`)
  const enRssBody = await enRss.text()
  ok(enRss.status === 200, `/en/blog/rss.xml yayında (${enRss.status})`)
  ok(enRssBody.includes('<language>en</language>'), 'İngilizce besleme dilini en olarak veriyor')
  ok(!enRssBody.includes('<item>'), 'boş beslemede yazı yok')

  const enPost404 = await fetch(`http://localhost:${PORT}/en/blog/olmayan-yazi`)
  ok(enPost404.status === 404, `bilinmeyen İngilizce yazı gerçek 404 (${enPost404.status})`)

  const llmsFullRes = await fetch(`http://localhost:${PORT}/llms-full.txt`)
  const llmsFull = await llmsFullRes.text()
  ok(llmsFullRes.status === 200, `llms-full.txt yayında (${llmsFullRes.status})`)
  /* llms-full.txt 26 Ağu 2026'da budandı: tam gövde değil, her maddenin
     başlığı + doğrudan cevabı + kanonik adresi. Üç şey korunur: destek hâlâ
     içinde, hesaplama araçları da girdi (eskiden hiç yoktu) ve dosya tam
     gövdeye geri şişmedi. Boyut eşiği 200 KB'a dönüşü yakalar. */
  ok(llmsFull.includes(firstArticle.title), 'llms-full.txt destek başlıklarını içeriyor')
  ok(llmsFull.includes('/hesapla/sofra-payin'), 'llms-full.txt hesaplama araçlarını içeriyor')
  ok(llmsFull.length < 80_000,
    `llms-full.txt özet kalıyor, tam gövdeye şişmemiş (${Math.round(llmsFull.length / 1024)} KB)`)

  const meta = await (
    await fetch(`http://localhost:${PORT}/api/seo/meta?path=/`)
  ).json()
  ok(meta.title?.includes('afiet') && meta.canonical, '/api/seo/meta tutarlı yanıt veriyor')

  const jsonldCount = (html.match(/application\/ld\+json/g) || []).length
  ok(jsonldCount >= 2, `JSON-LD blokları HTML'de (${jsonldCount})`)
  ok(html.includes('FAQPage'), 'FAQPage şeması HTML içinde')
  ok(html.includes('twitter:title'), 'twitter:title meta mevcut')

  /* Wikidata kimliği (#shared/utils/marka > WIKIDATA). Bu bağ SESSİZCE düşer:
     kaybolduğunda sayfa çalışmaya devam eder, hiçbir test kırılmaz ve kimlik
     çözümlemesinin en güçlü tek bağı gitmiş olur. Düğüm de kontrol ediliyor,
     çünkü adresin HTML'de bulunması onun DOĞRU düğümde durduğunu göstermiyor:
     kayıt uygulamayı tanımlıyor, kurum düğümüne kaymamalı. */
  const anaGraf = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .map((m) => {
      try {
        return JSON.parse(m[1])
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .flatMap((d) => d['@graph'] ?? [d])
  const uygulama = anaGraf.find((n) => n['@type'] === 'SoftwareApplication')
  const kurum = anaGraf.find((n) => n['@type'] === 'Organization')
  ok(
    uygulama?.sameAs?.some((u) => u.includes('wikidata.org/wiki/Q')),
    'Wikidata kimliği SoftwareApplication düğümünde',
  )
  ok(
    !kurum?.sameAs?.some((u) => u.includes('wikidata.org')),
    'kurum düğümü uygulamanın Wikidata kaydını sahiplenmiyor',
  )

  /* Uygulama düğümünün sabit kimliği (seoStore > mobilAppId). Kurumunkiyle
     aynı sebeple korunuyor: `@id` kaybolduğunda sayfa çalışır, şema geçerli
     kalır ve hata YALNIZ motor tarafında görünür - ana sayfadaki uygulama ile
     /en'deki uygulama iki ayrı adaya döner, Wikidata bağı da adreslenemeyen
     bir düğümde kalır. Kurumun `@id`si de burada kontrol ediliyor; ikisi tek
     ailedir ve biri düşerse diğerinin sağlam kalması bir şey ifade etmez. */
  ok(
    uygulama?.['@id']?.endsWith('/#app'),
    `uygulama düğümünün sabit kimliği var (${uygulama?.['@id'] ?? 'YOK'})`,
  )
  ok(
    kurum?.['@id']?.endsWith('/#organization'),
    `kurum düğümünün sabit kimliği var (${kurum?.['@id'] ?? 'YOK'})`,
  )

  /* Kimliğin ASIL sınavı burada: `/en` uygulama düğümünü kendisi basıyor ve
     kimliğin iki dilde AYNI olması gerekiyor - yoksa `@id` vermek hiçbir şeyi
     çözmez, yalnız iki adayı adlandırmış oluruz. Türkçe sayfa yukarıda okundu,
     İngilizcesi için ayrı bir istek gerekiyor. */
  const enGraf = [
    ...(await (await fetch(`http://localhost:${PORT}/en`)).text()).matchAll(
      /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs,
    ),
  ]
    .map((m) => {
      try {
        return JSON.parse(m[1])
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .flatMap((d) => d['@graph'] ?? [d])
  const enUygulama = enGraf.find((n) => n['@type'] === 'SoftwareApplication')
  ok(
    enUygulama?.['@id'] === uygulama?.['@id'],
    `/en uygulama düğümü Türkçesiyle aynı kimliği taşıyor (${enUygulama?.['@id'] ?? 'YOK'})`,
  )
  ok(
    enGraf.find((n) => n['@type'] === 'Organization')?.['@id'] === kurum?.['@id'],
    '/en kurum düğümü Türkçesiyle aynı kimliği taşıyor',
  )

  /* Mağaza kapısı (#shared/utils/marka > MAGAZA). Şemanın sayfadan fazlasını
     iddia etmemesini korur, üç ayrı biçimde:

     1. installUrl VAR ve App Store adresidir. 24 Ağu 2026'da uygulama yayına
        girdi; adres basılmazsa motorlar indirilebilir bir uygulamayı
        indirilemez sanır.
     2. Play adresi şemada YOK. Android bayrağı kapalı ve o adres bugün 404;
        404 bir indirme adresi bildirmek hiç bildirmemekten kötüdür.
     3. Uygulamanın kendisi ÜCRETSİZ (`price: "0"`), afiet+ ayrı bir `addOn`
        satırı. 26 Ağu 2026'ya kadar hiç Offer basılmıyordu çünkü site hiçbir
        yerde fiyat söylemiyordu; artık söylüyor ve şema onu taşıyor. Tersi de
        korunur: `price: "0"` kayarsa şema ücretsiz bir uygulamayı ücretli
        ilan eder.

     Dördü de sessizce ters dönebilecek hâller: biri kaydığında sayfa çalışmaya
     devam eder, yalnız arama motoruna söylenen şey yanlış olur. */
  ok(html.includes('"installUrl"') && html.includes('apps.apple.com'),
    'şema App Store indirme adresini bildiriyor')
  ok(!html.includes('play.google.com'),
    'şema Play adresini BİLDİRMİYOR (adres henüz 404)')
  ok(html.includes('"price":"0"') && html.includes('"isAccessibleForFree":true'),
    'şema uygulamanın ücretsiz olduğunu bildiriyor')
  ok(html.includes('"addOn"') && html.includes('"price":"129.90"'),
    'şema afiet+ fiyatını addOn olarak bildiriyor')

  /* Aboneliğin SÜRESİ (seoStore > mobilAppOffers). Düz `price` "129,90 TL"
     der ama "ayda" demez; aylık ile yıllığı ayıran tek şey `name` alanındaki
     Türkçe kelime olursa fiyatı doğru okumak makinenin o kelimeyi çevirmesine
     kalır. `unitCode` UN/CEFACT kodudur: MON ay, ANN yıl. İkisi karışırsa
     şema "yılda 129,90" ya da "ayda 799,99" der ve sayfa yine çalışır. */
  const abonelikler = uygulama?.addOn ?? []
  const aylik = abonelikler.find((o) => o.priceSpecification?.unitCode === 'MON')
  const yillik = abonelikler.find((o) => o.priceSpecification?.unitCode === 'ANN')
  ok(aylik?.price === '129.90', `aylık teklif ay birimiyle bildiriliyor (${aylik?.price ?? 'YOK'})`)
  ok(yillik?.price === '799.99', `yıllık teklif yıl birimiyle bildiriliyor (${yillik?.price ?? 'YOK'})`)

  /* İLK YIL TEKLİFİ ŞEMADA YOKTUR (kullanıcı kararı, 26 Ağu 2026'da konuldu,
     29 Ağu 2026'da yeniden soruldu ve korundu). Gerekçe `mobilAppOffers`
     yorumunda: `Offer` bitiş tarihi olmayan bir kampanyayı anlatamaz, o yüzden
     599,99 insana görünür metinde durur, şemada durmaz. Bu satır kararın
     kendisini korur: kampanya fiyatı bir gün şemaya sızarsa burada düşer. */
  ok(!JSON.stringify(uygulama ?? {}).includes('599.99'),
    'şema ilk yıl kampanyasını teklif olarak bildirmiyor')

  /* Teklifi kim veriyor. `seller` kurumun `@id`sine bağlanır ve düğüm tekrar
     EDİLMEZ; bağ koparsa fiyatlar sahipsiz kalır. */
  ok(abonelikler.every((o) => o.seller?.['@id'] === kurum?.['@id']),
    'afiet+ teklifleri kurum kimliğine bağlı')

  /* Fiyatın insan tarafından okunabilir kaynağı. Türkçede `/indir` üç sayıyı
     da yazıyor; İngilizcede fiyat yazan sayfa YOK, o yüzden orada `url`
     basılmaz (uydurulmuş kaynak, kaynaksızlıktan kötüdür). */
  ok(aylik?.url?.endsWith('/indir'), 'afiet+ teklifi fiyatı yazan sayfaya bağlı')
  ok((enUygulama?.addOn ?? []).every((o) => !o.url),
    '/en teklifleri olmayan bir İngilizce fiyat sayfasına bağlanmıyor')

  /* Fiyat TEK KAYNAKTAN gelir (`marka.ts > AFIET_PLUS`) ve üç sayı BİRLİKTE
     yazılır: yıllığın liste fiyatını tek başına söylemek eksik anlatır, çünkü
     bitiş tarihi olmayan bir ilk yıl teklifi yürürlükte. 129,99 basamağı
     Apple'ın TR merdiveninde YOKTUR; sızarsa yakalanmalı. */
  const fiyatHtml = await (await fetch(`http://localhost:${PORT}/indir`)).text()
  ok(fiyatHtml.includes('129,90') && fiyatHtml.includes('799,99')
    && fiyatHtml.includes('599,99'),
    '/indir üç fiyatı da yazıyor (aylık, yıllık, ilk yıl)')
  ok(!fiyatHtml.includes('129,99'), '/indir olmayan 129,99 basamağını yazmıyor')

  const plusRes = await fetch(`http://localhost:${PORT}/destek/baslangic/afiet-plus-nedir`)
  const plusHtml = await plusRes.text()
  ok(plusRes.status === 200, `afiet+ destek yazısı yayında (${plusRes.status})`)
  ok(plusHtml.includes('129,90') && plusHtml.includes('799,99')
    && plusHtml.includes('599,99'),
    'afiet+ yazısı üç fiyatı da yazıyor')

  // --- Afi'ye sor: SSS sözleşmesini bozmadan eklendi mi ---
  ok(html.includes('id="afiye-sor"'), 'Afi’ye sor bölümü prerender HTML içinde')
  ok(html.includes('ne merak ediyorsan sor'), 'Afi daveti prerender HTML içinde')
  ok((html.match(/<details/g) || []).length >= 3, 'SSS <details> öğeleri hâlâ HTML içinde')
  // Panel ileride Turnstile yükleyecek; sayfa açılışında YÜKLENMEMELİ.
  ok(
    !html.includes('challenges.cloudflare.com'),
    'Turnstile sayfa yüklemede yok (yalnız etkileşimde yüklenir)',
  )

  browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })

  ok((await page.title()).includes('afiet'), `başlık: ${await page.title()}`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  ok(true, 'h1 görünür')

  // --- Bölümler ve içerik sayıları ---
  ok((await page.locator('#neden article').count()) === 6, '6 zag kartı')
  ok((await page.locator('ul li p').count()) === 4, '4 ses tonu balonu')
  ok((await page.locator('#haber').count()) === 1, 'kapanış bölümü mevcut')
  ok(
    (await page.locator('#haber a[href="/indir"]').count()) >= 1,
    'kapanış bölümü indirme sayfasına yönlendiriyor',
  )
  /* Mağaza rozetleri MAĞAZA BAŞINA bayrağa bakar (#shared/utils/marka).
     Test bayrağın DEĞERİNİ değil, açık mağazanın gerçekten bağlantı OLDUĞUNU
     ve kapalı olanın bağlantı OLMADIĞINI korur: iki hâl de sessizce ters
     dönebilir ve 404 bir mağaza adresi yayınlamak en pahalı hatadır. */
  const appStoreLink = await page.locator('#haber a[href*="apps.apple.com"]').count()
  const playLink = await page.locator('#haber a[href*="play.google.com"]').count()
  ok(appStoreLink >= 1, `App Store rozeti bağlantı (${appStoreLink})`)
  ok(playLink === 0, `Google Play rozeti bağlantı DEĞİL, adres henüz 404 (${playLink})`)

  // --- Scroll reveal çalışıyor ---
  await page.locator('#haber').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const revealed = await page.locator('.reveal.is-in').count()
  ok(revealed > 0, `scroll reveal çalışıyor (${revealed} eleman)`)

  // --- Header CTA indirme sayfasına götürüyor ---
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('navigation').getByRole('link', { name: 'afiet’i indir' }).first().click()
  await page.waitForURL('**/indir', { timeout: 10000 })
  ok(page.url().endsWith('/indir'), 'header CTA /indir sayfasına götürüyor')
  await page.goBack({ waitUntil: 'networkidle' })

  // --- Mobil menü: küçük ekranda bağlantılar ulaşılabilir olmalı ---
  await page.setViewportSize({ width: 380, height: 800 })
  await page.reload({ waitUntil: 'networkidle' })
  const menu = page.locator('header details.site-menu')
  ok((await menu.count()) === 1, 'mobil menü mevcut')
  ok(!(await page.locator('header details.site-menu div a').first().isVisible()),
    'menü kapalıyken bağlantılar gizli')
  await menu.locator('summary').click()
  ok(await page.locator('header details.site-menu').getByRole('link', { name: 'Blog' }).isVisible(),
    'menü açılınca Blog bağlantısı görünüyor')
  await page.locator('header details.site-menu').getByRole('link', { name: 'Blog' }).click()
  await page.waitForURL('**/blog', { timeout: 10000 })
  ok(page.url().includes('/blog'), 'mobil menüden Blog’a gidiliyor')
  ok(!(await page.locator('header details.site-menu[open]').count()),
    'yol değişince menü kapanıyor')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })

  // --- /indir sayfası: mağaza rozetleri ve içerik ---
  await page.goto(`http://localhost:${PORT}/indir`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { level: 1, name: 'afiet’i indir.' }).waitFor()
  ok(true, '/indir h1 görünür')
  ok(
    (await page.getByText('Android sürümü yolda', { exact: false }).count()) > 0,
    '/indir Android durumunu açıkça söylüyor',
  )
  const indirAppStore = page.locator('a[href*="apps.apple.com"]').first()
  ok((await indirAppStore.count()) === 1, '/indir App Store bağlantısı taşıyor')
  ok(
    (await indirAppStore.getAttribute('target')) === '_blank' &&
      (await indirAppStore.getAttribute('rel')) === 'noopener',
    'mağaza bağlantısı yeni sekmede ve rel=noopener',
  )
  ok(
    (await page.locator('a[href*="play.google.com"]').count()) === 0,
    '/indir Play adresine bağlantı VERMİYOR (adres 404)',
  )
  ok((await page.locator('details').count()) >= 4, '/indir SSS maddeleri render oluyor')

  await page.reload({ waitUntil: 'networkidle' })

  // --- Afi'ye sor paneli: çip → akış → cevap ---
  // Önceki testler sayfayı /indir'e götürdü; panel ana sayfada.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  const afiSection = page.locator('#afiye-sor')
  await afiSection.scrollIntoViewIfNeeded()
  ok((await afiSection.count()) === 1, 'Afi’ye sor bölümü sayfada')

  // Marka değişmezleri (afiet-brand/maskot/README.md): buhar HEP iki tel,
  // yüz hiç değişmez (iki göz + bir gülümseme). Kod artık buna dayanıyor.
  ok(
    (await page.locator('#afiye-sor .afi-stage .afi-steam').count()) === 2,
    'Afi maskotunda tam iki buhar teli var',
  )
  ok(
    (await page.locator('#afiye-sor .afi-stage svg g[stroke="#047857"] path').count()) === 3,
    'Afi’nin yüzü değişmedi (iki göz + gülümseme)',
  )

  await page.locator('#afi-soru').focus()
  ok(
    (await page.locator('#afiye-sor .afi-stage').getAttribute('data-mood')) === 'listening',
    'input odakta Afi “dinliyor” moduna geçiyor',
  )

  const chipsBefore = await page.locator('#afiye-sor [data-afi-chip]').count()
  await page.locator('#afiye-sor [data-afi-chip]').first().click()
  await page.waitForFunction(
    () => !document.querySelector('#afiye-sor [aria-busy="true"]'),
    null,
    { timeout: 25000 },
  )
  ok(
    (await page.locator('#afiye-sor li').count()) === 2,
    'soru ve cevap balonu sohbete eklendi',
  )
  ok(
    (await page.locator('#afiye-sor [data-afi-chip]').count()) === chipsBefore - 1,
    'kullanılan çip listeden düşüyor',
  )
  ok(
    (await afiSection.textContent())?.includes('kalori saydırmaz'),
    'Afi’nin cevabı ekrana akıyor',
  )

  ok(errors.length === 0, `konsol/sayfa hatası yok${errors.length ? `: ${errors[0]}` : ''}`)

  // --- JS'siz sözleşme: SSS JS olmadan da çalışır (FaqSection.vue docblock'u) ---
  const noJsCtx = await browser.newContext({ javaScriptEnabled: false })
  const noJsPage = await noJsCtx.newPage()
  await noJsPage.goto(`http://localhost:${PORT}/`)
  const noJsDetails = await noJsPage.locator('#sss details').count()
  ok(noJsDetails >= 3, `JS'siz SSS öğeleri var (${noJsDetails})`)
  await noJsPage.locator('#sss details summary').first().click()
  ok(
    await noJsPage.locator('#sss details[open]').first().isVisible(),
    "JS'siz <details> açılıyor",
  )
  ok((await noJsPage.locator('#afiye-sor').count()) === 1, "JS'siz sayfada Afi bölümü de var")

  // Destek yazısı JS'siz de tam okunur olmalı: gövde sunucuda render edilir,
  // yan menü ve içindekiler native <details>tir. Arama kutusu çalışmaz, o kadar.
  await noJsPage.goto(`http://localhost:${PORT}${articlePath}`)
  ok(
    (await noJsPage.locator('.destek-govde h2').count()) > 0,
    "JS'siz destek yazısının gövdesi görünür",
  )
  await noJsCtx.close()

  // --- Destek merkezi: tarayıcı davranışı ---
  await page.goto(`http://localhost:${PORT}/destek`, { waitUntil: 'networkidle' })
  ok((await page.locator('#konular a').count()) === 7, '7 kategori kartı görünüyor')

  const searchBox = page.locator('#destek-ara-large')
  await searchBox.click()
  await searchBox.fill('olcu')
  // Dizin kutuya ilk odaklanmada indirilir; panel "Aranıyor…" ile açılabilir,
  // o yüzden panelin değil SONUCUN görünmesini bekle.
  await page.locator('#destek-sonuclar [role="option"]').first().waitFor({ timeout: 8000 })
  ok(
    (await page.locator('#destek-sonuclar [role="option"]').count()) > 0,
    'aksansız arama ("olcu") sonuç buluyor',
  )

  // Türkçe ünsüz yumuşaması: kök "grup" yazılır, metinde "grubun" geçer.
  // Belirli bir yazıyı beklemiyoruz (korpus büyüdükçe sıra değişir); yumuşamış
  // biçimle eşleşen EN AZ BİR sonuç çıkması kuralın çalıştığını kanıtlar.
  await searchBox.fill('grup adı')
  await page.locator('#destek-sonuclar [role="option"]').first().waitFor({ timeout: 8000 })
  const softened = await page.locator('#destek-sonuclar [role="option"]').allInnerTexts()
  ok(
    softened.some((t) => /grub/i.test(t) && !/grup/i.test(t.split('\n')[0] ?? '')),
    `yumuşayan kök ("grup" → "grub...") eşleşiyor (${softened.length} sonuç)`,
  )

  await searchBox.fill('zzzqqq')
  await page.getByRole('button', { name: 'Bunu Afi’ye soralım mı?' }).waitFor({ timeout: 5000 })
  ok(true, 'sonuçsuz arama Afi’ye devrediyor')

  await searchBox.fill('')
  await page.locator('#konular a').first().click()
  await page.waitForURL('**/destek/**')
  ok(page.url().includes('/destek/'), 'kategori kartı kategoriye götürüyor')

  // --- Hesap motoru tarayıcıda gerçekten çalışıyor mu ---
  await page.goto(`http://localhost:${PORT}/hesapla/sofra-payin`, { waitUntil: 'networkidle' })
  await page.getByLabel('Yaş').fill('34')
  await page.getByLabel('Boy (cm)').fill('172')
  await page.getByLabel('Kilo (kg)').fill('74')
  await page.getByRole('button', { name: 'Tabağımı göster' }).click()
  const plateResult = page.locator('[aria-live="polite"]')
  await plateResult.waitFor({ timeout: 8000 })
  const plateText = await plateResult.innerText()
  ok(/avuç içi/.test(plateText), 'sonuçta el ölçüsü çıkıyor')
  ok(/yumruk/.test(plateText) && /kapalı avuç/.test(plateText), 'dört el ölçüsü de var')
  ok(/bardak/.test(plateText), 'su satırı var')
  // § 12: kalori katlanmış durur, açılmadan görünmez.
  ok(!/kcal/.test(plateText), 'kalori varsayılan olarak görünmüyor')
  await page.getByText('Sayıları göster').click()
  await page.waitForTimeout(200)
  ok(/kcal/.test(await plateResult.innerText()), 'kalori ancak açınca görünüyor')
  // 18 yaş altı: hedef üretilmez
  await page.getByLabel('Yaş').fill('16')
  await page.getByRole('button', { name: 'Yeniden hesapla' }).click()
  await page.waitForTimeout(300)
  const minorText = await plateResult.innerText()
  ok(/hedef vermeyeceğiz/.test(minorText), '18 yaş altında hedef üretilmiyor')
  ok(!/avuç içi/.test(minorText), '18 yaş altında el ölçüsü de gösterilmiyor')

  await page.goto(`http://localhost:${PORT}/hesapla/vucut-kitle-indeksi`, { waitUntil: 'networkidle' })
  await page.getByLabel('Boy (cm)').fill('172')
  await page.getByLabel('Kilo (kg)').fill('74')
  await page.getByRole('button', { name: 'İndeksimi göster' }).click()
  const bmiText = await page.locator('[aria-live="polite"]').innerText()
  ok(/25/.test(bmiText), `VKİ hesaplanıyor (${bmiText.split('\n')[0]})`)
  ok(/aralı/i.test(bmiText), 'VKİ yargısız aralık etiketi gösteriyor')

  await page.goto(`http://localhost:${PORT}/hesapla/gunluk-su`, { waitUntil: 'networkidle' })
  await page.getByLabel('Yaş').fill('34')
  await page.getByLabel('Boy (cm)').fill('172')
  await page.getByLabel('Kilo (kg)').fill('74')
  await page.getByRole('button', { name: 'Su ihtiyacımı göster' }).click()
  const suText = await page.locator('[aria-live="polite"]').innerText()
  ok(/bardak/.test(suText) && /litre/.test(suText), 'su ihtiyacı bardak ve litre veriyor')

  await page.goto(`http://localhost:${PORT}/hesapla/porsiyon-cevirici`, { waitUntil: 'networkidle' })
  await page.locator('#besin-ara').fill('beyaz peynir')
  await page.getByRole('button', { name: /Beyaz peynir/ }).first().click()
  const porsiyon = page.locator('[aria-live="polite"]')
  await porsiyon.waitFor({ timeout: 8000 })
  const porsiyonText = await porsiyon.innerText()
  ok(/dilim/.test(porsiyonText), 'porsiyon çevirici besnin ölçüsünü gösteriyor')
  ok(/\bg\b/.test(porsiyonText), 'gram karşılığı gösteriliyor')
  ok(/Süt Ürünü|Protein/.test(porsiyonText), 'besin grupları gösteriliyor')
  ok(!/kcal/.test(porsiyonText), 'porsiyon çeviricide kalori varsayılan gizli')

  // --- İngilizce araçlar tarayıcıda: iki birim sistemi + TR ile AYNI sayı ---
  // Motor (@afiet/core aynası) metrik konuşur; imperial dönüşüm formun
  // kapısında olur. Bu blok iki şeyi korur: dönüşümün doğruluğu ve "site
  // aynı hesabı iki dilde de aynı veriyor" iddiası.
  await page.goto(`http://localhost:${PORT}/en/tools/bmi-calculator`, { waitUntil: 'networkidle' })
  // Varsayılan imperial: 5 ft 8 in + 163 lb ≈ 172,7 cm + 73,9 kg → ~24,8
  await page.getByLabel('Height (feet)').fill('5')
  await page.getByLabel('Height (inches)').fill('8')
  await page.getByLabel('Weight (lb)').fill('163')
  await page.getByRole('button', { name: 'Show my index' }).click()
  const enBmiImperial = await page.locator('[aria-live="polite"]').innerText()
  ok(/24\.8/.test(enBmiImperial), `imperial VKİ doğru çevriliyor (${enBmiImperial.split('\n')[0]})`)
  ok(/Balance range/.test(enBmiImperial), 'VKİ aralığı İngilizce ve yargısız')

  // Metriğe geçince alanlar sıfırlanır (yazılan sayı öteki sistemde anlamsız).
  await page.getByText('cm, kg').click()
  await page.getByLabel('Height (cm)').fill('172')
  await page.getByLabel('Weight (kg)').fill('74')
  await page.getByRole('button', { name: /Show my index|Calculate again/ }).click()
  const enBmiMetric = await page.locator('[aria-live="polite"]').innerText()
  ok(/25/.test(enBmiMetric), `metrik VKİ TR sayfayla aynı (${enBmiMetric.split('\n')[0]})`)

  await page.goto(`http://localhost:${PORT}/en/tools/daily-portions-calculator`, {
    waitUntil: 'networkidle',
  })
  await page.getByText('cm, kg').click()
  await page.getByLabel('Age').fill('34')
  await page.getByLabel('Height (cm)').fill('172')
  await page.getByLabel('Weight (kg)').fill('74')
  await page.getByRole('button', { name: 'Show my plate' }).click()
  const enPlate = page.locator('[aria-live="polite"]')
  await enPlate.waitFor({ timeout: 8000 })
  const enPlateText = await enPlate.innerText()
  ok(/palms?/.test(enPlateText), 'İngilizce el ölçüsü çıkıyor (palm)')
  ok(
    /fists?/.test(enPlateText) && /cupped hands?/.test(enPlateText) && /thumbs?/.test(enPlateText),
    'dört el ölçüsü de İngilizce',
  )
  ok(/glasses/.test(enPlateText), 'su satırı var')
  ok(!/kcal/.test(enPlateText), 'kalori varsayılan olarak görünmüyor')
  // Aynı girdi, aynı sayı: TR sayfadan okunan avuç içi sayısı ile EN palm aynı.
  const trPalm = /(\d+(?:-\d+)?)\s+avuç içi/.exec(plateText)?.[1]
  const enPalm = /(\d+(?:-\d+)?)\s+palms?/.exec(enPlateText)?.[1]
  ok(
    Boolean(trPalm) && trPalm === enPalm,
    `aynı girdide TR ve EN aynı sayıyı veriyor (${trPalm} = ${enPalm})`,
  )
  await page.getByText('Show the numbers').click()
  await page.waitForTimeout(200)
  ok(/kcal/.test(await enPlate.innerText()), 'kalori ancak açınca görünüyor')
  // 18 yaş altı rayı İngilizce'de de geçerli.
  await page.getByLabel('Age').fill('16')
  await page.getByRole('button', { name: 'Calculate again' }).click()
  await page.waitForTimeout(300)
  const enMinor = await enPlate.innerText()
  ok(/will not give you a target/.test(enMinor), '18 yaş altında hedef üretilmiyor')
  ok(!/palms?/.test(enMinor), '18 yaş altında el ölçüsü de gösterilmiyor')


  // --- İsteğe bağlı ekran görüntüleri ---
  if (process.env.SHOT_DIR) {
    mkdirSync(process.env.SHOT_DIR, { recursive: true })
    // Reveal animasyonları bitmiş halde yakalamak için sayfayı adım adım gez
    const settle = async () => {
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += innerHeight * 0.7) {
          scrollTo({ top: y, behavior: 'instant' })
          await new Promise((r) => setTimeout(r, 180))
        }
        scrollTo({ top: 0, behavior: 'instant' })
      })
      await page.waitForTimeout(900)
    }
    await settle()
    await page.screenshot({ path: join(process.env.SHOT_DIR, 'indir-desktop-full.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await settle()
    await page.screenshot({ path: join(process.env.SHOT_DIR, 'indir-mobile-full.png'), fullPage: true })
    console.log(`  → ekran görüntüleri: ${process.env.SHOT_DIR}`)
  }

  console.log('\nSMOKE OK ✅')
} catch (e) {
  console.error(`\nSMOKE FAILED ❌  ${e.message}`)
  process.exitCode = 1
} finally {
  await browser?.close()
  server.kill()
}
