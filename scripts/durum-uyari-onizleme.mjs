/**
 * Durum uyarı maillerinin prova sayfası.
 *
 * `server/utils/statusAlertMail.ts` içindeki GERÇEK fonksiyonları çağırır -
 * yani burada gördüğün gövde, kesinti anında kutuna düşecek gövdenin ta
 * kendisidir, taklidi değil. (Node 24 tip açıklamalarını kendisi soyuyor,
 * derleme adımı yok.)
 *
 * Nöbetçi mailleri (son iki bölüm) afiet-backend'de Go ile üretilir; burada
 * yalnız tasarımı onaylansın diye aynı tokenlarla elle kuruldu. Go tarafı
 * değişirse bu bölüm de elden geçmeli.
 *
 *   node scripts/durum-uyari-onizleme.mjs [cikti.html]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { buildAlertMail } from '../server/utils/statusAlertMail.ts'
import { diagnose } from '../server/utils/statusDiagnose.ts'

const OUT = resolve(process.argv[2] ?? '.shots/durum-uyari.html')

/** Gerçek olaydan alınan zaman: 14 Ağustos 2026, 11:55 (Europe/Istanbul). */
const T = (hhmm) => new Date(`2026-08-14T${hhmm}:00+03:00`)

const AYAKTA = ['Uygulama sunucusu', 'Web sitesi', 'Afi yapay zekâ', 'Kimlik doğrulama', 'E-posta iletimi']

/** Gerçek 503 gövdesi: kendi /readyz'imiz sebebi JSON'da yazar. */
const READYZ_DB = '{"status":"unavailable","reason":"db ping başarısız"}'

/**
 * Kart, teşhisiyle birlikte. `diagnose` gerçek kural tablosudur: aşağıdaki
 * "muhtemel sebep" cümlelerini de üretimdeki kodun kendisi yazdı.
 */
const item = (over = {}) => {
  const base = {
    component: 'db',
    name: 'Veritabanı',
    provider: false,
    kind: 'yeni',
    state: 'down',
    detail: 'HTTP 503',
    latencyMs: null,
    startedAt: T('11:55'),
    ...over,
  }
  const evidence = over.evidence ?? { status: 503, bodySnippet: READYZ_DB }
  const ham = [evidence.bodySnippet, evidence.networkError, evidence.incident]
    .filter(Boolean)
    .join(' | ')
  if (base.state === 'up') return base
  return {
    ...base,
    diagnosis: diagnose({
      component: base.component,
      state: base.state,
      detail: base.detail,
      evidence,
      providers: over.providers ?? {},
      brokenCount: over.brokenCount ?? 1,
    }),
    rawEvidence: ham || undefined,
  }
}

/** Örnek log satırları: Logging API'den gelen biçimin birebir aynısı. */
const ORNEK_LOG = [
  '11:54:58 db ping başarısız hata=failed to connect to host=ep-cool-frost-123456.eu-central-1.aws.neon.tech: dial tcp: i/o timeout',
  '11:54:41 [503] GET /v1/summary/range · veritabanı havuzu yanıt vermedi',
  '11:54:12 readyz: şema doğrulaması başarısız',
]

/** Örnek arama sonucu: Tavily biçimi (anahtar varsa böyle döner). */
const ORNEK_ARAMA = {
  query: 'Neon Postgres compute suspended quota exceeded connection refused',
  result: {
    provider: 'tavily',
    answer:
      'Neon suspends a project\'s computes when the account consumption quota is reached; the suspension persists until the next billing period.',
    hits: [
      {
        title: 'Connection errors - Neon Docs',
        url: 'https://neon.com/docs/connect/connection-errors',
        snippet:
          'Errors seen when a compute is suspended, when the connection limit is reached, or when the endpoint cannot be resolved.',
      },
      {
        title: 'Configure consumption limits - Neon Docs',
        url: 'https://neon.com/docs/guides/consumption-limits',
        snippet:
          'Limits act as thresholds after which all active computes for a project are suspended.',
      },
    ],
  },
}

/** Bölümler: her biri bir tetikleyici koşul + o koşulun ürettiği gerçek mail. */
const bolumler = [
  {
    etiket: 'kesinti',
    ton: 'crit',
    baslik: 'Bir bileşen ilk kez yanıt vermiyor',
    aciklama:
      'Kontrol turu bileşeni "down" gördüğü anda çıkar; ikinci turu beklemez. 14 Ağustos\'taki iki olay tam olarak buydu ve hiçbir yere haber gitmemişti. Teşhis üç katmanlı: kural tablosunun hükmü, sunucunun kendi log satırları, sonra dışarısı. Buradaki log ve arama içeriği örnektir, biçim gerçektir.',
    mail: buildAlertMail([item()], T('11:55'), {
      healthy: AYAKTA,
      logs: ORNEK_LOG,
      search: ORNEK_ARAMA,
    }),
  },
  {
    etiket: 'kesinti',
    ton: 'crit',
    baslik: 'Aynı turda birden fazla bileşen düşüyor',
    aciklama:
      'Veritabanı düşünce uygulama sunucusu da düşer. Bileşen başına ayrı mail YOK: tur başına tek mail, en kötü durum konuya çıkar. Uygulama sunucusunun teşhisi bu yüzden "önce veritabanına bak" der.',
    mail: buildAlertMail(
      [
        item(),
        item({
          component: 'api',
          name: 'Uygulama sunucusu',
          detail: 'zaman aşımı (8000 ms)',
          startedAt: T('11:55'),
          evidence: { networkError: 'zaman aşımı (8000 ms)' },
          brokenCount: 2,
        }),
      ],
      T('11:55'),
      { healthy: ['Web sitesi', 'Afi yapay zekâ', 'Kimlik doğrulama', 'E-posta iletimi'] },
    ),
  },
  {
    etiket: 'yavaşlama',
    ton: 'warn',
    baslik: 'Yanıt 4 saniyeyi geçiyor',
    aciklama:
      'Kesinti değil ama kullanıcı hissediyor. Aynı eşikle: ilk yavaş turda çıkar. Durum sayfasında bu, günü sarıya boyayan hâl.',
    mail: buildAlertMail(
      [
        item({
          component: 'api',
          name: 'Uygulama sunucusu',
          state: 'degraded',
          detail: 'yavaş yanıt (6200 ms)',
          latencyMs: 6200,
          startedAt: T('09:40'),
          evidence: { status: 200 },
        }),
      ],
      T('09:40'),
      { healthy: ['Veritabanı', 'Web sitesi', 'Afi yapay zekâ', 'Kimlik doğrulama', 'E-posta iletimi'] },
    ),
  },
  {
    etiket: 'sağlayıcı',
    ton: 'warn',
    baslik: 'Sağlayıcı kendi durum sayfasında olay bildiriyor',
    aciklama:
      'Bizde henüz bir şey bozulmamış olabilir; bu erken uyarıdır ve sebep tartışmasızdır, çünkü cümleyi sağlayıcının kendisi yazmış. Sağlayıcının durum sayfasına ULAŞILAMAMASI uyarı saymaz (o gürültüdür, sessizce geçilir).',
    mail: buildAlertMail(
      [
        item({
          component: 'provider:neon',
          name: 'Neon',
          provider: true,
          state: 'degraded',
          detail: 'Neon: degraded performance',
          startedAt: T('03:15'),
          evidence: {
            incident:
              'Elevated connection errors in eu-central-1 - We are investigating elevated error rates when establishing new connections.',
          },
        }),
      ],
      T('03:15'),
    ),
  },
  {
    etiket: 'hatırlatma',
    ton: 'crit',
    baslik: 'Olay sürüyor, 30 dakika doldu',
    aciklama:
      'Aynı bileşen aynı durumda kaldığı sürece yarım saatte bir tekrarlar. Uyandırmadıysa unutturmasın diye. Hatırlatmada web araması TEKRARLANMAZ, teşhis o anki taze kanıttan yeniden kurulur.',
    mail: buildAlertMail([item({ kind: 'suruyor' })], T('12:30'), { healthy: AYAKTA }),
  },
  {
    etiket: 'çözüldü',
    ton: 'ok',
    baslik: 'Bileşen toparlandı',
    aciklama:
      'Kesinti mailini gördükten sonra merakta kalmayasın diye. Süre, kesintinin gerçek uzunluğudur.',
    mail: buildAlertMail([item({ kind: 'cozuldu', state: 'up', detail: '' })], T('12:00'), {
      healthy: AYAKTA,
    }),
  },
]

/* --------------------------------------------------------------------------
 * Nöbetçi mailleri (afiet-backend, Go). Web tamamen düşerse yukarıdaki
 * kontrol turu hiç koşmaz ve hiçbir mail gelmez; bu iki mail o kör noktayı
 * kapatır ve BAŞKA bir platformdan (Cloud Run) çıkar.
 * ------------------------------------------------------------------------ */
const P = {
  bg: '#fdfaf3',
  card: '#ffffff',
  ink: '#022c22',
  body: '#322f2a',
  muted: '#605a4f',
  faint: '#97907f',
  line: '#ece4d4',
  accent: '#059669',
  critBg: '#fef3f2',
  critPen: '#b42318',
  warnBg: '#fff7ed',
  warnPen: '#9a3412',
  font: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
}

const nobetciMail = (tone, rozet, baslik, satirlar) => {
  const [bg, border, pen] =
    tone === 'crit' ? [P.critBg, '#fecdca', P.critPen] : [P.warnBg, '#fed7aa', P.warnPen]
  const alt = satirlar
    .map((s) => `<div style="margin:6px 0 0;font-size:15px;color:${P.body}">${s}</div>`)
    .join('')
  return `<body style="margin:0;padding:0;background:${P.bg}">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:${P.font};color:${P.body};font-size:16px;line-height:1.65">
  <div style="margin-bottom:22px">
    <span style="font-size:22px;font-weight:800;color:${P.accent}">afiet</span>
    <span style="color:${P.faint};font-size:13px;font-weight:700"> · nöbetçi</span>
  </div>
  <p style="margin:0 0 14px;font-size:14px;color:${P.muted}">14 Ağustos 11:55</p>
  <div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:16px 18px;margin:0 0 12px">
    <span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${pen}">${rozet}</span>
    <div style="margin:4px 0 0;font-size:19px;font-weight:800;color:${P.ink}">${baslik}</div>
    ${alt}
  </div>
  <p style="margin:22px 0 0">
    <a href="https://afiet.co/durum" style="display:inline-block;background:${P.accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:999px">Durum sayfasını aç</a>
  </p>
  <hr style="border:none;border-top:1px solid ${P.line};margin:28px 0 14px">
  <p style="color:${P.faint};font-size:13px;margin:0">
    Bu mail uygulama sunucusundaki nöbetçiden geldi (5 dakikada bir, web'den bağımsız). Durum sayfasının kendisi konuşamadığında konuşan taraf budur.
  </p>
</div>
</body>`
}

bolumler.push(
  {
    etiket: 'nöbetçi',
    ton: 'crit',
    baslik: 'afiet.co dışarıdan yanıt vermiyor',
    aciklama:
      'Nöbetçi Cloud Run\'da yaşar, siteyi dışarıdan yoklar. Web düşerse durum kontrolü de düşer, yani bu maili gönderebilecek tek taraf odur.',
    mail: {
      subject: '[afiet] KESİNTİ: afiet.co yanıt vermiyor',
      text: [
        '14 Ağustos 11:55',
        '',
        '- afiet.co: yanıt vermiyor · HTTP 502 · 11:55\'ten beri (5 dk)',
        '- Durum kontrolü de düşmüş olabilir: son kontrol 11:50.',
        '',
        'Durum sayfası: https://afiet.co/durum',
        '',
        'Bu mail uygulama sunucusundaki nöbetçiden geldi (5 dakikada bir, web\'den bağımsız).',
      ].join('\n'),
      html: nobetciMail('crit', 'kesinti', 'afiet.co yanıt vermiyor', [
        'HTTP 502 · 11:55\'ten beri · 5 dk',
        'Son durum kontrolü 11:50\'de yazılmış.',
      ]),
    },
  },
  {
    etiket: 'nöbetçi',
    ton: 'warn',
    baslik: 'Durum kontrolü yazmayı bıraktı',
    aciklama:
      'Site ayakta görünüyor ama 5 dakikalık tur 20 dakikadır tabloya bir şey yazmamış: cron durmuş, sır bozulmuş ya da Vercel işi düşürüyor. Sessizlik de bir arızadır ve tam bu yüzden fark edilmez.',
    mail: {
      subject: '[afiet] Durum kontrolü durdu (son kontrol 22 dk önce)',
      text: [
        '14 Ağustos 11:55',
        '',
        '- Durum kontrolü: son yazım 11:33, üstünden 22 dk geçti (beklenen aralık 5 dk).',
        '- afiet.co ayakta (HTTP 200).',
        '',
        'Durum sayfası: https://afiet.co/durum',
        '',
        'Bu mail uygulama sunucusundaki nöbetçiden geldi (5 dakikada bir, web\'den bağımsız).',
      ].join('\n'),
      html: nobetciMail('warn', 'sessizlik', 'Durum kontrolü yazmayı bıraktı', [
        'Son yazım 11:33 · üstünden 22 dk geçti (beklenen 5 dk)',
        'afiet.co ayakta (HTTP 200), yani sorun turun kendisinde.',
      ]),
    },
  },
)

/* --------------------------------------------------------------------------
 * Prova sayfası
 * ------------------------------------------------------------------------ */
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Mail gövdesini sayfaya gömmek için <body> kabuğunu soy. */
const govde = (html) =>
  html
    .replace(/^[\s\S]*?<body[^>]*>/, '')
    .replace(/<\/body>[\s\S]*$/, '')
    .trim()

const onizleme = (text) => text.split('\n').filter(Boolean)[1] ?? ''

const bolumHtml = (b) => `
<section class="varyant">
  <header class="varyant-bas">
    <span class="cip cip-${b.ton}">${esc(b.etiket)}</span>
    <h2>${esc(b.baslik)}</h2>
    <p class="aciklama">${esc(b.aciklama)}</p>
  </header>

  <div class="kutu">
    <div class="satir">
      <span class="kimden">afiet durum</span>
      <span class="konu">${esc(b.mail.subject)}</span>
      <span class="onizleme">${esc(onizleme(b.mail.text))}</span>
    </div>
  </div>

  <div class="mail">${govde(b.mail.html)}</div>

  <details class="duz">
    <summary>Düz metin sürümü</summary>
    <pre>${esc(b.mail.text)}</pre>
  </details>
</section>`

const sayfa = `<title>Durum Nöbeti Provası</title>
<style>
  :root {
    --ground: #eceeed;
    --surface: #ffffff;
    --ink: #10201b;
    --body: #3c4743;
    --muted: #6d7873;
    --line: #d7ddda;
    --line-soft: #e6eae8;
    --crit: #b42318;
    --warn: #9a3412;
    --ok: #047857;
    --chrome: #14514a;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #101614;
      --surface: #18201d;
      --ink: #e9efec;
      --body: #b6c2bd;
      --muted: #8a9792;
      --line: #27322e;
      --line-soft: #202a26;
      --crit: #f2827a;
      --warn: #f0a875;
      --ok: #5fd0a0;
      --chrome: #6ee7b7;
    }
  }
  :root[data-theme="dark"] {
    --ground: #101614;
    --surface: #18201d;
    --ink: #e9efec;
    --body: #b6c2bd;
    --muted: #8a9792;
    --line: #27322e;
    --line-soft: #202a26;
    --crit: #f2827a;
    --warn: #f0a875;
    --ok: #5fd0a0;
    --chrome: #6ee7b7;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--body);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .kap { max-width: 940px; margin: 0 auto; padding: 56px 24px 96px; }

  .ust { display: flex; flex-direction: column; gap: 14px; margin-bottom: 12px; }
  .ust .kas {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--chrome);
  }
  h1 {
    margin: 0;
    font-size: clamp(30px, 4vw, 42px);
    line-height: 1.12;
    letter-spacing: -.02em;
    color: var(--ink);
    text-wrap: balance;
  }
  .giris { margin: 0; max-width: 62ch; color: var(--muted); }
  .kunye {
    display: flex; flex-wrap: wrap; gap: 8px 20px;
    margin: 22px 0 0; padding: 14px 0 0;
    border-top: 1px solid var(--line);
    font-family: var(--mono); font-size: 12.5px; color: var(--muted);
  }
  .kunye b { color: var(--ink); font-weight: 600; }

  .liste { display: flex; flex-direction: column; gap: 52px; margin-top: 56px; }

  .varyant { display: flex; flex-direction: column; gap: 14px; }
  .varyant-bas { display: flex; flex-direction: column; gap: 6px; }
  .varyant-bas h2 {
    margin: 0; font-size: 21px; line-height: 1.25; letter-spacing: -.01em;
    color: var(--ink); font-weight: 650;
  }
  .aciklama { margin: 0; max-width: 66ch; font-size: 15px; color: var(--muted); }

  .cip {
    align-self: flex-start;
    font-family: var(--mono); font-size: 11.5px; font-weight: 600;
    letter-spacing: .1em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 4px;
    border: 1px solid currentColor;
  }
  .cip-crit { color: var(--crit); }
  .cip-warn { color: var(--warn); }
  .cip-ok { color: var(--ok); }

  .kutu {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
  }
  .satir {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 4px 18px;
    padding: 14px 18px;
    align-items: baseline;
  }
  .kimden { font-size: 14px; font-weight: 650; color: var(--ink); }
  .konu {
    font-family: var(--mono); font-size: 14px; font-weight: 600;
    color: var(--ink); word-break: break-word;
  }
  .onizleme {
    grid-column: 2; font-size: 13.5px; color: var(--muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .mail {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    background: #fdfaf3;
    color-scheme: light;
  }
  .mail > div { max-width: none !important; }

  details.duz {
    border-top: 1px solid var(--line-soft);
    padding-top: 10px;
  }
  details.duz summary {
    cursor: pointer; font-size: 13.5px; color: var(--muted);
    font-family: var(--mono); letter-spacing: .02em;
  }
  details.duz summary:focus-visible { outline: 2px solid var(--chrome); outline-offset: 3px; }
  details.duz pre {
    margin: 12px 0 0; padding: 16px 18px;
    background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
    font-family: var(--mono); font-size: 13px; line-height: 1.6; color: var(--body);
    white-space: pre-wrap; overflow-x: auto;
  }

  .alt {
    margin-top: 64px; padding-top: 20px;
    border-top: 1px solid var(--line);
    font-size: 14px; color: var(--muted);
  }
  .alt ul { margin: 10px 0 0; padding-left: 20px; }
  .alt li { margin: 4px 0; }

  @media (max-width: 640px) {
    .satir { grid-template-columns: 1fr; }
    .onizleme { grid-column: 1; }
  }
</style>

<div class="kap">
  <header class="ust">
    <span class="kas">afiet · durum nöbeti</span>
    <h1>Kesinti olduğunda kutuna düşecek mailler</h1>
    <p class="giris">
      Aşağıdaki gövdeler taklit değil: kodun kendisi üretti. Sekiz bölümün her biri
      bir tetikleyici koşulu ve o koşulun ürettiği maili gösteriyor. Konu satırı bu
      işin gerçek arayüzü, çünkü telefon bildiriminde çoğu zaman görülen tek şey o.
    </p>
    <div class="kunye">
      <span><b>Gönderen</b> uyari@posta.afiet.co</span>
      <span><b>Alıcı</b> berk@afiet.co</span>
      <span><b>Tur</b> 5 dk</span>
      <span><b>Hatırlatma</b> 30 dk</span>
    </div>
  </header>

  <main class="liste">
${bolumler.map(bolumHtml).join('\n')}
  </main>

  <footer class="alt">
    <p>Onayını beklediğim yerler:</p>
    <ul>
      <li>Konu satırındaki <code>[afiet]</code> öneki ve KESİNTİ / Yavaşlama / Sağlayıcı uyarısı / Çözüldü ayrımı.</li>
      <li>Sağlayıcı uyarılarının aynı kutuya düşmesi (Vercel, Neon, Google Cloud, Azure). Ayrı bir eşiğe çekilebilir.</li>
      <li>Nöbetçinin sessizlik eşiği: son kontrol 20 dakikayı geçince konuşuyor.</li>
      <li>Teşhisin üç katmanı: kural tablosu, sunucu logları, canlı arama. Arama yalnız yeni olayda yapılır.</li>
    </ul>
  </footer>
</div>`

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, sayfa, 'utf8')
console.log(`prova yazıldı: ${OUT}`)
