import type { ProbeEvidence, ServiceState } from '~~/server/utils/statusStore'

/**
 * "Neden 503 aldık" sorusunun cevabı. Kural tablosu: imza → sebep → bakılacak yer.
 *
 * NEDEN TABLO, NEDEN AJAN DEĞİL (kullanıcı kararı, 16 Ağu 2026): teşhis
 * kesinti anında lazım ve o an ajan da düşmüş olabilir. Tablo ücretsiz,
 * deterministik ve uydurmaz; bilmediği imzada susar ("tanınmayan imza") ve
 * ham kanıtı olduğu gibi gösterir. Yanlış bir sebep, sebepsizlikten kötüdür.
 *
 * Kanıtın üç kaynağı var, güçlüden zayıfa:
 *  1. Sağlayıcının kendi olay metni (o anda Neon/GCP/Vercel/Azure olay
 *     bildiriyorsa sebep tartışmasız odur) → 'kesin'
 *  2. Yanıt gövdesindeki imza. Kendi `/readyz`imiz sebebi JSON'da yazar
 *     ("db ping başarısız", "şema çözümlenemedi"); Cloud Run ve Vercel de
 *     kendi hata cümlelerini basar → 'muhtemel'
 *  3. Hiçbiri tutmazsa bileşene göre genel sebep → 'tahmin'
 *
 * Cloud Run hata cümleleri Google'ın "Troubleshoot Cloud Run issues"
 * belgesinden birebir alındı; Vercel kodları vercel.com/docs/errors'tan.
 */

export type Confidence = 'kesin' | 'muhtemel' | 'tahmin'

export interface DiagnosisLink {
  label: string
  url: string
}

export interface Diagnosis {
  /** Tek cümle: büyük ihtimalle ne oldu. */
  cause: string
  /** Tek cümle: sıradaki adım. */
  action: string
  links: DiagnosisLink[]
  confidence: Confidence
  /**
   * Canlı web aramasının soracağı soru. Türkçe iç metinlerimiz aranmaz;
   * burada sağlayıcının kendi terimleriyle kurulmuş İngilizce sorgu durur.
   * Boşsa arama yapılmaz (tanınmayan imzada aranacak bir şey de yoktur).
   */
  query?: string
}

export interface DiagnoseInput {
  component: string
  state: Exclude<ServiceState, 'none' | 'up'>
  detail: string
  evidence?: ProbeEvidence
  /** Aynı turdaki sağlayıcı satırları: 'neon' → { state, incident }. */
  providers?: Record<string, { state: ServiceState; incident?: string }>
  /** Aynı turda bozulan bileşen sayısı. */
  brokenCount?: number
}

const PROJE = 'afiet-co'
const RUN_SERVIS = 'app-api-prod'
const RUN_BOLGE = 'europe-west1'

const LINK = {
  runLogs: {
    label: 'Cloud Run logları',
    url: `https://console.cloud.google.com/run/detail/${RUN_BOLGE}/${RUN_SERVIS}/logs?project=${PROJE}`,
  },
  runRevisions: {
    label: 'Cloud Run revizyonları',
    url: `https://console.cloud.google.com/run/detail/${RUN_BOLGE}/${RUN_SERVIS}/revisions?project=${PROJE}`,
  },
  neon: { label: 'Neon konsolu', url: 'https://console.neon.tech/app/projects' },
  neonStatus: { label: 'Neon durum sayfası', url: 'https://neonstatus.com' },
  vercel: { label: 'Vercel panosu', url: 'https://vercel.com/dashboard' },
  vercelStatus: { label: 'Vercel durum sayfası', url: 'https://www.vercel-status.com' },
  gcpStatus: { label: 'Google Cloud durumu', url: 'https://status.cloud.google.com' },
  azureStatus: { label: 'Azure durumu', url: 'https://azure.status.microsoft/status' },
  foundry: { label: 'Azure AI Foundry', url: 'https://ai.azure.com' },
  stack: { label: 'Hexclave (Stack Auth) panosu', url: 'https://app.stack-auth.com' },
  resend: { label: 'Resend panosu', url: 'https://resend.com/emails' },
  secrets: {
    label: 'Secret Manager',
    url: `https://console.cloud.google.com/security/secret-manager?project=${PROJE}`,
  },
} as const satisfies Record<string, DiagnosisLink>

/** Bileşen hangi sağlayıcının üstünde duruyor: olay eşleştirmesi buradan. */
const SAGLAYICI: Record<string, string> = {
  api: 'gcp',
  db: 'neon',
  web: 'vercel',
  afi: 'azure',
}

const SAGLAYICI_ADI: Record<string, string> = {
  gcp: 'Google Cloud',
  neon: 'Neon',
  vercel: 'Vercel',
  azure: 'Azure',
}

const SAGLAYICI_LINK: Record<string, DiagnosisLink> = {
  gcp: LINK.gcpStatus,
  neon: LINK.neonStatus,
  vercel: LINK.vercelStatus,
  azure: LINK.azureStatus,
}

/** Bileşen tanınmadığında bile bir yere bakılabilsin. */
const VARSAYILAN_LINK: Record<string, DiagnosisLink[]> = {
  api: [LINK.runLogs, LINK.runRevisions],
  db: [LINK.neon, LINK.runLogs],
  web: [LINK.vercel, LINK.vercelStatus],
  afi: [LINK.foundry, LINK.azureStatus],
  auth: [LINK.stack],
  email: [LINK.resend],
}

interface Kural {
  /** Yalnız bu bileşenlerde denenir; boşsa hepsinde. */
  bilesenler?: string[]
  imza: RegExp
  cause: string
  action: string
  links: DiagnosisLink[]
  query?: string
}

/**
 * İmza tablosu. Sıra önemlidir: ilk tutan kazanır, o yüzden dar imzalar
 * geniş olanlardan önce gelir.
 */
const KURALLAR: Kural[] = [
  // --- Kendi /readyz'imizin sebepleri. En değerlileri: sunucu bize
  // arızanın hangi katmanda olduğunu zaten söylüyor. ---
  {
    bilesenler: ['api', 'db'],
    imza: /şema çözümlenemedi/i,
    cause:
      'Havuzlu bağlantının search_path\'i boşalmış: bağlantı açık ama sorgular tabloları göremiyor. Bu bilinen tuzak, pooled uçtan SET koşulduğunda prod\'u indirir.',
    action:
      'Cloud Run loglarında "şema doğrulaması başarısız" satırını bul; pooled uca elle SET koşan bir oturum ya da yeni bir migration var mı bak. Servisi yeniden dağıtmak bağlantı havuzunu tazeler.',
    links: [LINK.runLogs, LINK.neon],
    query: 'Postgres pooled connection search_path empty schema not visible pgbouncer',
  },
  {
    bilesenler: ['api', 'db'],
    imza: /db ping başarısız/i,
    cause:
      'Uygulama Neon\'a hiç bağlanamıyor. En sık üç sebep: compute uykuda ya da uyanamıyor, hesap kotası dolduğu için compute askıya alınmış, bağlantı sayısı tükenmiş.',
    action:
      'Neon konsolunda projenin compute durumuna ve kota kullanımına bak. Kota hesap seviyesindedir: dolduğunda üç ortam birden düşer.',
    links: [LINK.neon, LINK.neonStatus, LINK.runLogs],
    query: 'Neon Postgres compute suspended quota exceeded connection refused',
  },
  {
    bilesenler: ['api', 'db'],
    imza: /store yok/i,
    cause:
      'Sunucu veritabanı yapılandırması OLMADAN açılmış: DATABASE_URL sırrı okunamamış ya da boş gelmiş olabilir.',
    action:
      'Son dağıtımın sır bağlarını kontrol et. Yeni bir secret eklendiyse çalışma servis hesabına erişim verilmemiş olması muhtemel (bilinen tuzak).',
    links: [LINK.secrets, LINK.runRevisions],
  },

  // --- Cloud Run'ın kendi hata cümleleri (Google belgelerinden birebir). ---
  {
    imza: /the request failed because either the HTTP response was malformed or connection to the instance had an error/i,
    cause:
      'Cloud Run örneğe bağlanamadı: örnek çökmüş, belleği aşıp sonlandırılmış ya da bozuk bir yanıt dönmüş olabilir.',
    action:
      'Cloud Run loglarında aynı dakikadaki çökme/bellek satırlarını ara. Sık tekrarlıyorsa bellek sınırını yükselten yeni bir revizyon gerekir.',
    links: [LINK.runLogs, LINK.runRevisions],
    query:
      'Cloud Run 503 "the request failed because either the HTTP response was malformed or connection to the instance had an error"',
  },
  {
    imza: /the request was aborted because there was no available instance/i,
    cause:
      'Boşta örnek kalmamış: ya azami örnek sınırına dayandık ya soğuk başlangıç uzadı ya da tek istek çok uzun sürdü.',
    action:
      'Cloud Run\'da istek sayısı ve örnek sayısı grafiğine bak; ani bir yük varsa azami örnek sınırını yükselt.',
    links: [LINK.runLogs, LINK.runRevisions],
    query: 'Cloud Run "the request was aborted because there was no available instance" max instances',
  },
  {
    imza: /the request failed because the instance could not start successfully/i,
    cause:
      'Konteyner hiç açılamadı. En sık sebebi Secret Manager\'dan bir sırrın okunamaması, ardından açılışta atılan bir hata.',
    action: 'Son revizyonun açılış loglarını ve sır bağlarını kontrol et; gerekirse önceki revizyona dön.',
    links: [LINK.runRevisions, LINK.secrets, LINK.runLogs],
    query: 'Cloud Run "the request failed because the instance could not start successfully"',
  },
  {
    imza: /using too much memory and was terminated/i,
    cause: 'Örnek bellek sınırını aştı ve sonlandırıldı; bellek sızıntısı ya da yetersiz bellek ayarı.',
    action: 'Bellek grafiğine bak; kalıcıysa daha yüksek bellekli yeni revizyon çıkar.',
    links: [LINK.runLogs, LINK.runRevisions],
    query: 'Cloud Run container instance too much memory terminated 503',
  },
  {
    imza: /reached the maximum request timeout/i,
    cause: 'İstek, hizmetin azami süre sınırına takıldı: yanıt zamanında dönmedi.',
    action: 'Hangi ucun uzadığını loglardan bul; sınırı yükseltmeden önce yavaşlığın sebebine bak.',
    links: [LINK.runLogs],
    query: 'Cloud Run 504 "reached the maximum request timeout"',
  },

  // --- Vercel hata kodları (yanıt gövdesine basılır). ---
  {
    bilesenler: ['web'],
    imza: /FUNCTION_INVOCATION_TIMEOUT|EDGE_FUNCTION_INVOCATION_TIMEOUT/i,
    cause: 'Sunucu fonksiyonu süre tavanına takıldı (bizde 60 sn). Çoğu zaman yavaş bir veri çağrısı.',
    action:
      'Vercel loglarında hangi yolun zaman aşımına uğradığına bak. Toplu iş yapan uçlar (indeks taraması, cron) parti boyunu aşmış olabilir.',
    links: [LINK.vercel],
    query: 'Vercel FUNCTION_INVOCATION_TIMEOUT maxDuration nitro',
  },
  {
    bilesenler: ['web'],
    imza: /NO_RESPONSE_FROM_FUNCTION|FUNCTION_INVOCATION_FAILED/i,
    cause: 'Sunucu fonksiyonu hata fırlattı ve hiç yanıt dönmedi.',
    action: 'Vercel loglarındaki yığın izine bak; son dağıtım şüpheliyse önceki dağıtıma geri al.',
    links: [LINK.vercel],
    query: 'Vercel NO_RESPONSE_FROM_FUNCTION 502 debug',
  },
  {
    bilesenler: ['web'],
    imza: /DEPLOYMENT_(NOT_FOUND|PAUSED|DISABLED|DELETED)/i,
    cause: 'Alan adının işaret ettiği dağıtım yok, duraklatılmış ya da silinmiş.',
    action: 'Vercel panosunda production dağıtımının ve alan adı bağının durumunu kontrol et.',
    links: [LINK.vercel],
    query: 'Vercel DEPLOYMENT_NOT_FOUND domain production deployment',
  },

  // --- Ağ katmanı. Gövde yok, elimizde yalnız hatanın kendisi var. ---
  {
    imza: /zaman aşımı/i,
    cause:
      'Uç sekiz saniyede hiç yanıt vermedi. Süreç ayakta ama kilitlenmiş, ağ yolu kopmuş ya da bölge sorunlu olabilir.',
    action: 'Aynı anda başka bileşen de düştüyse sağlayıcı tarafına, tek başınaysa hizmetin kendi loglarına bak.',
    links: [],
  },
  {
    imza: /ENOTFOUND|EAI_AGAIN|dns/i,
    cause: 'Alan adı çözülemedi: DNS kaydı ya da alan adı sağlayıcısı tarafında bir sorun.',
    action: 'Cloudflare\'de kaydın yerinde olduğunu doğrula; alan adının süresi de kontrol edilmeli.',
    links: [],
    query: 'DNS ENOTFOUND domain resolution failure Cloudflare',
  },
  {
    imza: /certificate|TLS|SSL/i,
    cause: 'TLS el sıkışması başarısız: sertifika süresi dolmuş ya da zincir bozulmuş olabilir.',
    action: 'Sertifikanın bitiş tarihini kontrol et (Vercel ve Cloudflare tarafı ayrı ayrı).',
    links: [],
    query: 'TLS certificate expired handshake failure',
  },
]

/** Bileşen başına, hiçbir imza tutmadığında söylenecek dürüst cümle. */
const GENEL: Record<string, { cause: string; action: string }> = {
  api: {
    cause: 'Uygulama sunucusu yanıt vermiyor ve yanıt tanınan bir imza taşımıyor.',
    action: 'Cloud Run loglarına bak: son dağıtım, çökme ve bellek satırları ilk üç şüpheli.',
  },
  db: {
    cause: 'Veritabanı sağlık kontrolü geçmiyor ve sebep yanıttan okunamadı.',
    action: 'Neon konsolunda compute durumunu, ardından Cloud Run loglarındaki bağlantı hatasını oku.',
  },
  web: {
    cause: 'Site yanıt vermiyor ve yanıt tanınan bir Vercel hata kodu taşımıyor.',
    action: 'Vercel panosunda son dağıtımın ve fonksiyon loglarının durumuna bak.',
  },
  afi: {
    cause: 'Afi\'nin dayandığı Azure tarafında bir aksama görünüyor.',
    action: 'Azure durum sayfasını ve Foundry\'deki dağıtımın kotasını kontrol et.',
  },
  auth: {
    cause: 'Kimlik doğrulama sağlayıcısı (Hexclave) beş yüzlü hata dönüyor.',
    action: 'Sağlayıcının panosuna ve durum duyurularına bak; giriş akışı bu süre boyunca çalışmaz.',
  },
  email: {
    cause: 'Resend API beş yüzlü hata dönüyor.',
    action: 'Resend panosuna bak; bu süre boyunca doğrulama ve bildirim mailleri gecikir.',
  },
}

/**
 * Tek bir bozuk kontrol için teşhis üretir.
 *
 * Sağlayıcı olayı her şeyi ezer: Neon "degraded" diyorsa bizim 503'ümüzün
 * sebebini tahmin etmenin anlamı yok, sebebi zaten sağlayıcı yazmış.
 */
export function diagnose(input: DiagnoseInput): Diagnosis {
  const { component, evidence } = input
  const bilesenAdi = component.replace(/^provider:/, '')

  // 0) Satırın kendisi bir sağlayıcı satırıysa, olay metni zaten sebeptir.
  if (component.startsWith('provider:')) {
    const ad = SAGLAYICI_ADI[bilesenAdi] ?? bilesenAdi
    return {
      cause: evidence?.incident
        ? `${ad} kendi durum sayfasında olay bildiriyor: ${evidence.incident}`
        : `${ad} kendi durum sayfasında bir aksama bildiriyor.`,
      action:
        'Bizim bileşenlerimiz şimdilik ayakta olabilir; bu erken uyarıdır. Sağlayıcının olay sayfasını takip et.',
      links: [SAGLAYICI_LINK[bilesenAdi] ?? LINK.gcpStatus],
      confidence: 'kesin',
      query: evidence?.incident ? `${ad} incident ${evidence.incident.slice(0, 80)}` : undefined,
    }
  }

  // 1) Bileşenin sağlayıcısı aynı turda olay bildiriyor mu?
  const saglayiciId = SAGLAYICI[component]
  const saglayici = saglayiciId ? input.providers?.[saglayiciId] : undefined
  if (saglayici && (saglayici.state === 'down' || saglayici.state === 'degraded')) {
    const ad = SAGLAYICI_ADI[saglayiciId!] ?? saglayiciId!
    return {
      cause: saglayici.incident
        ? `Sebep bizde değil: ${ad} şu anda olay bildiriyor. "${saglayici.incident}"`
        : `Sebep bizde değil: ${ad} şu anda aksama bildiriyor.`,
      action: 'Sağlayıcının olay sayfasını takip et; bizim tarafta yapılacak bir şey yok.',
      links: [SAGLAYICI_LINK[saglayiciId!] ?? LINK.gcpStatus, ...(VARSAYILAN_LINK[component] ?? [])],
      confidence: 'kesin',
    }
  }

  // 2) İmza tablosu. Gövde, ağ hatası ve detay metni birlikte aranır.
  const metin = [evidence?.bodySnippet, evidence?.networkError, input.detail]
    .filter(Boolean)
    .join(' | ')
  for (const kural of KURALLAR) {
    if (kural.bilesenler && !kural.bilesenler.includes(component)) continue
    if (!kural.imza.test(metin)) continue
    return {
      cause: kural.cause,
      action: kural.action,
      links: kural.links.length > 0 ? kural.links : (VARSAYILAN_LINK[component] ?? []),
      confidence: 'muhtemel',
      query: kural.query,
    }
  }

  // 3) Zincir sebebi: veritabanı düştüyse uygulama sunucusunun düşmesi sonuçtur.
  if (component === 'api' && (input.brokenCount ?? 0) > 1) {
    return {
      cause:
        'Birden fazla bileşen aynı anda düştü. Veritabanı da listedeyse kök sebep büyük ihtimalle orada, uygulama sunucusu onun ardından düşmüştür.',
      action: 'Önce veritabanı satırındaki teşhise bak; uygulama sunucusu çoğu zaman onun sonucudur.',
      links: VARSAYILAN_LINK.api ?? [],
      confidence: 'tahmin',
    }
  }

  const genel = GENEL[component] ?? {
    cause: 'Kontrol başarısız ve yanıt tanınan bir imza taşımıyor.',
    action: 'Ham kanıta bak; yeni bir imzaysa kural tablosuna eklenmeli.',
  }
  return {
    cause: genel.cause,
    action: genel.action,
    links: VARSAYILAN_LINK[component] ?? [],
    confidence: 'tahmin',
    // Tanınmayan imzada canlı arama en çok işe yarayan yerdedir: elimizdeki
    // tek şey ham gövde, onu da sağlayıcının terimleriyle arayamayız.
    query: evidence?.bodySnippet ? evidence.bodySnippet.slice(0, 120) : undefined,
  }
}
