import { ImageResponse } from '@vercel/og'
import UPNG from 'upng-js'
import { encode as encodeJpeg } from 'jpeg-js'
import { getPublishedPost } from '~~/server/utils/contentStore'
import { LOGO_SVG, dataUri } from '~~/server/utils/kapakSvg'
import { h } from '~~/server/utils/satoriEl'
import type { StoryPayload } from '~~/server/utils/storyPayload'

/**
 * Blog yazısının Instagram story'si, istekte çizilir: /story/<slug>.png
 * (1080×1920). Payload'ı içerik hattı üretir ve yayından sonra
 * /api/internal/blog/story ile iliştirir; payload'sız yazı 404 döner.
 *
 * İskelet afiet-brand/social/templates/story-blog.html'in Satori portudur;
 * ölçüler ve güvenli alanlar oradan birebir taşındı: marka şeridi 150px'te
 * (Instagram üst UI'sinin altında), CTA bölgesi 260px tabanda (gerçek link
 * sticker'ı ONUN üstüne bırakılır), adres satırı 128px'te. Orta sahne
 * yazının türüne göre değişir (chips | soru | mit | adimlar, storyPayload);
 * görsel dil el işidir ve sabittir, ajan yalnız metin ve seçim doldurur.
 *
 * İKİ ÇIKTI BİÇİMİ, iki niyet: .png mail arşividir ve elle paylaşım için
 * "yeni yazıyı oku" CTA'sını taşır (link sticker'ı üstüne bırakılır);
 * .jpg Instagram Content Publishing API'sinin kaynağıdır (API görselde
 * JPEG ister) ve CTA'sı "profildeki linkten oku" yazar, çünkü API ile
 * paylaşılan story'ye link sticker EKLENEMEZ. Biçim, niyeti kodlar.
 *
 * Elle şablondan iki bilinçli sapma:
 *   - Rozet arkasındaki backdrop blur yok (Satori çizemez); yakın okunuşlu
 *     yarı saydam dolgu + kenarlık kullanılır.
 *   - CTA "yeni yazı -> oku" değil "yeni yazıyı oku": ok işareti Nunito'da
 *     yok ve Satori bilinmeyen glifi sessizce düşürür.
 *
 * Mit kartlarında kırmızı YOK: marka kırmızıyı uyarı dili olarak
 * kullanmıyor (destek merkezi kuralıyla aynı); "sanılan" sönük durur,
 * "gerçek" zümrütle konuşur.
 */

/** Chip disk renkleri (cream ruhu): el şablonundaki sıra ve değerler. */
const CHIP_COLORS = ['#0ea5e9', '#f97316', '#16a34a', '#f43f5e', '#f59e0b']

const MOOD = {
  emerald: {
    background: 'linear-gradient(160deg, #10b981, #047857)',
    ink: '#ffffff',
    accent: '#a7f3d0',
    sub: '#d1fae5',
    brand: '#ffffff',
    badgeBg: 'rgba(255,255,255,0.16)',
    badgeBorder: 'rgba(255,255,255,0.34)',
    badgeInk: '#ffffff',
    chipLabel: '#ecfdf5',
    hintBg: '#ffffff',
    hintInk: '#059669',
    co: 'rgba(255,255,255,0.74)',
    // sahne kartları: koyu zeminde yarı saydam beyaz
    cardBg: 'rgba(255,255,255,0.14)',
    cardBorder: 'rgba(255,255,255,0.26)',
    cardInk: '#ffffff',
    cardMuted: 'rgba(255,255,255,0.66)',
    stepNumBg: '#ffffff',
    stepNumInk: '#059669',
    glows: [
      { size: 800, color: 'rgba(167,243,208,0.26)', top: -220, left: -200 },
      { size: 560, color: 'rgba(249,115,22,0.14)', bottom: -160, right: -170 },
    ],
  },
  cream: {
    background: '#fdfaf3',
    ink: '#022c22',
    accent: '#059669',
    sub: '#605a4f',
    brand: '#059669',
    badgeBg: 'rgba(167,243,208,0.13)',
    badgeBorder: '#a7f3d0',
    badgeInk: '#059669',
    chipLabel: '', // cream'de etiket disk rengini alır
    hintBg: '#059669',
    hintInk: '#ffffff',
    co: '#97907f',
    cardBg: '#ffffff',
    cardBorder: '#ece4d4',
    cardInk: '#022c22',
    cardMuted: '#97907f',
    stepNumBg: '#059669',
    stepNumInk: '#ffffff',
    glows: [
      { size: 760, color: 'rgba(167,243,208,0.5)', top: -220, right: -180 },
      { size: 560, color: 'rgba(244,63,94,0.12)', bottom: -180, left: -160 },
    ],
  },
} as const

type Mood = (typeof MOOD)[keyof typeof MOOD]

type Glow = { size: number; color: string; top?: number; bottom?: number; left?: number; right?: number }

const glowEl = (g: Glow) =>
  h('div', {
    style: {
      position: 'absolute',
      width: `${g.size}px`,
      height: `${g.size}px`,
      ...(g.top !== undefined ? { top: `${g.top}px` } : {}),
      ...(g.bottom !== undefined ? { bottom: `${g.bottom}px` } : {}),
      ...(g.left !== undefined ? { left: `${g.left}px` } : {}),
      ...(g.right !== undefined ? { right: `${g.right}px` } : {}),
      backgroundImage: `radial-gradient(circle, ${g.color} 0%, rgba(0,0,0,0) 70%)`,
    },
  })

/**
 * Hook satırını vurgu parçasına bölerek span'lara çevirir. Ham metinle
 * elementi aynı kapta karıştırmak Satori'de hataya düşer (kapak rotasının
 * dersi); her parça kendi span'ında durur.
 */
function hookLine(line: string, accent: string, inkColor: string, accentColor: string) {
  const at = accent ? line.indexOf(accent) : -1
  const parts =
    at < 0
      ? [{ text: line, color: inkColor }]
      : [
          { text: line.slice(0, at), color: inkColor },
          { text: accent, color: accentColor },
          { text: line.slice(at + accent.length), color: inkColor },
        ]
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'center' } },
    ...parts
      .filter((p) => p.text !== '')
      .map((p) => h('span', { style: { display: 'flex', color: p.color, whiteSpace: 'pre' } }, p.text)),
  )
}

// ── Orta sahneler ───────────────────────────────────────────────────────────

/** chips: 3-5 emoji diski (ilk şablonun sahnesi). */
function chipsScene(story: StoryPayload, m: Mood) {
  const isCream = story.mood === 'cream'
  return h(
    'div',
    { style: { display: 'flex', gap: '18px', marginTop: '64px', justifyContent: 'center' } },
    ...(story.chips ?? []).map((c, i) => {
      const color = CHIP_COLORS[i % CHIP_COLORS.length]
      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '150px' } },
        h(
          'div',
          {
            style: {
              width: '150px', height: '150px', borderRadius: '50%', background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '82px',
              ...(isCream
                ? { border: `5px solid ${color}`, boxShadow: '0 18px 34px rgba(50,47,42,0.08)' }
                : { boxShadow: '0 22px 44px rgba(2,44,34,0.45)' }),
            },
          },
          c.emoji,
        ),
        h(
          'div',
          { style: { display: 'flex', fontSize: '31px', fontWeight: 800, letterSpacing: '-.02em', color: isCream ? color : m.chipLabel } },
          c.label,
        ),
      )
    }),
  )
}

/** soru: büyük merkez disk + şık pill'leri (anket havası, sticker değil). */
function soruScene(story: StoryPayload, m: Mood) {
  const isCream = story.mood === 'cream'
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '44px', marginTop: '58px' } },
    h(
      'div',
      {
        style: {
          width: '290px', height: '290px', borderRadius: '50%', background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '158px',
          ...(isCream
            ? { border: '6px solid #a7f3d0', boxShadow: '0 22px 44px rgba(50,47,42,0.10)' }
            : { boxShadow: '0 26px 52px rgba(2,44,34,0.45)' }),
        },
      },
      story.buyukEmoji ?? '',
    ),
    h(
      'div',
      { style: { display: 'flex', gap: '18px', justifyContent: 'center' } },
      ...(story.secenekler ?? []).map((s) =>
        h(
          'div',
          {
            style: {
              fontSize: '34px', fontWeight: 800, letterSpacing: '-.01em',
              borderRadius: '999px', padding: '16px 34px', display: 'flex',
              background: m.cardBg, border: `3px solid ${m.cardBorder}`, color: m.cardInk,
            },
          },
          s,
        ),
      ),
    ),
  )
}

/**
 * mit: "sanılan" sönük kart, "gerçek" zümrütle konuşan kart. Etiketlerde
 * işaret YOK: ✕/✓ Nunito'da bulunmuyor ve emoji karşılıkları (❌/✅) hem
 * bağırıyor hem "sanılan"a markanın kullanmadığı kırmızıyı sokuyor; ayrımı
 * renk ve ağırlık taşır.
 */
function mitScene(story: StoryPayload, m: Mood) {
  const isCream = story.mood === 'cream'
  const card = (label: string, text: string, strong: boolean) =>
    h(
      'div',
      {
        style: {
          display: 'flex', flexDirection: 'column', gap: '10px', width: '840px',
          borderRadius: '26px', padding: '30px 38px',
          background: strong ? (isCream ? '#ffffff' : '#ffffff') : m.cardBg,
          border: strong
            ? `4px solid ${isCream ? '#a7f3d0' : '#ffffff'}`
            : `3px solid ${m.cardBorder}`,
          ...(strong ? { boxShadow: isCream ? '0 18px 34px rgba(50,47,42,0.08)' : '0 22px 44px rgba(2,44,34,0.40)' } : {}),
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex', gap: '12px', fontSize: '27px', fontWeight: 800,
            letterSpacing: '.06em', color: strong ? '#059669' : m.cardMuted,
          },
        },
        label,
      ),
      h(
        'div',
        {
          style: {
            display: 'flex', fontSize: '38px', fontWeight: 800, lineHeight: 1.25,
            letterSpacing: '-.015em', color: strong ? '#022c22' : m.cardMuted,
          },
        },
        text,
      ),
    )
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '56px', alignItems: 'center' } },
    card('sanılan', story.sanilan ?? '', false),
    card('gerçek', story.gercek ?? '', true),
  )
}

/** adimlar: 3-4 numaralı adım satırı; numara rozeti destek merkezi kuralı. */
function adimlarScene(story: StoryPayload, m: Mood) {
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '56px', alignItems: 'center' } },
    ...(story.adimlar ?? []).map((a, i) =>
      h(
        'div',
        {
          style: {
            display: 'flex', alignItems: 'center', gap: '22px', width: '840px',
            borderRadius: '22px', padding: '20px 28px',
            background: m.cardBg, border: `3px solid ${m.cardBorder}`,
          },
        },
        h(
          'div',
          {
            style: {
              width: '58px', height: '58px', borderRadius: '50%', flexShrink: 0,
              background: m.stepNumBg, color: m.stepNumInk,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '30px', fontWeight: 900,
            },
          },
          String(i + 1),
        ),
        h('div', { style: { display: 'flex', fontSize: '44px' } }, a.emoji),
        h(
          'div',
          { style: { display: 'flex', fontSize: '34px', fontWeight: 800, letterSpacing: '-.015em', color: m.cardInk } },
          a.text,
        ),
      ),
    ),
  )
}

function scene(story: StoryPayload, m: Mood) {
  switch (story.kind) {
    case 'soru':
      return soruScene(story, m)
    case 'mit':
      return mitScene(story, m)
    case 'adimlar':
      return adimlarScene(story, m)
    default:
      return chipsScene(story, m)
  }
}

export default defineEventHandler(async (event) => {
  const raw = String(getRouterParam(event, 'slug') ?? '')
  const wantsJpeg = raw.endsWith('.jpg')
  const slug = raw.replace(/\.(png|jpg)$/, '')
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    throw createError({ statusCode: 400, statusMessage: 'gecersiz_slug' })

  const post = await getPublishedPost(event, slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'yazi_bulunamadi' })
  const story: StoryPayload | null = post.story
  if (!story) throw createError({ statusCode: 404, statusMessage: 'story_yok' })

  const m = MOOD[story.mood]
  // Vurgu, içinde geçtiği İLK satırda renklenir; öbür satırlar düz kalır.
  const lines = story.hook.split('\n')
  const accentLineAt = lines.findIndex((l) => l.includes(story.accent))

  const store = useStorage('assets:server')
  const [extra, black] = await Promise.all([
    store.getItemRaw('fonts/Nunito-ExtraBold.ttf'),
    // 900, kapaktaki iki ağırlığın yanına bu iş için örneklendi: story
    // başlığı el şablonunda Black'tir ve 800 o puntoda gözle seçilir
    // biçimde zayıf kalır.
    store.getItemRaw('fonts/Nunito-Black.ttf'),
  ])
  if (!extra || !black) throw createError({ statusCode: 500, statusMessage: 'font_yok' })

  const image = new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '1080px',
          height: '1920px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 90px',
          fontFamily: 'Nunito',
          position: 'relative',
          ...(story.mood === 'emerald'
            ? { backgroundImage: m.background }
            : { backgroundColor: m.background }),
          overflow: 'hidden',
        },
      },
      ...m.glows.map(glowEl),
      // Marka şeridi: mini Afi + sözcük markası
      h(
        'div',
        {
          style: {
            position: 'absolute', top: '150px', left: '0', right: '0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px',
          },
        },
        h('img', { src: dataUri(LOGO_SVG), width: 78, height: 78 }),
        h('div', { style: { fontSize: '44px', fontWeight: 900, color: m.brand, letterSpacing: '-.02em' } }, 'afiet'),
      ),
      // "yeni yazı" rozeti
      h(
        'div',
        { style: { position: 'absolute', top: '262px', left: '0', right: '0', display: 'flex', justifyContent: 'center' } },
        h(
          'div',
          {
            style: {
              fontSize: '37px', fontWeight: 800, color: m.badgeInk,
              background: m.badgeBg, border: `2px solid ${m.badgeBorder}`,
              borderRadius: '999px', padding: '14px 34px', display: 'flex',
              alignItems: 'center', gap: '12px', letterSpacing: '-.01em',
            },
          },
          '📖 yeni yazı',
        ),
      ),
      // Başlık
      h(
        'div',
        {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            fontSize: '106px', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.03,
          },
        },
        ...lines.map((line, i) =>
          hookLine(line, i === accentLineAt ? story.accent : '', m.ink, m.accent),
        ),
      ),
      // Alt cümle
      h(
        'div',
        {
          style: {
            display: 'flex', fontSize: '41px', fontWeight: 800, color: m.sub,
            marginTop: '30px', lineHeight: 1.32, maxWidth: '820px', textAlign: 'center', justifyContent: 'center',
          },
        },
        story.sub,
      ),
      // Orta sahne: yazının türüne göre
      scene(story, m),
      // CTA bölgesi: gerçek link sticker'ı bu pill'in üstüne bırakılır
      h(
        'div',
        { style: { position: 'absolute', bottom: '260px', left: '0', right: '0', display: 'flex', justifyContent: 'center' } },
        h(
          'div',
          {
            style: {
              fontSize: '41px', fontWeight: 800, background: m.hintBg, color: m.hintInk,
              borderRadius: '999px', padding: '24px 48px', display: 'flex', alignItems: 'center',
              gap: '14px', letterSpacing: '-.01em',
              boxShadow: story.mood === 'emerald' ? '0 18px 36px rgba(2,44,34,0.42)' : '0 18px 36px rgba(5,150,105,0.42)',
            },
          },
          wantsJpeg ? '🔗 profildeki linkten oku' : '👆 yeni yazıyı oku',
        ),
      ),
      // Adres satırı
      h(
        'div',
        { style: { position: 'absolute', bottom: '128px', left: '0', right: '0', display: 'flex', justifyContent: 'center', fontSize: '33px', fontWeight: 800, color: m.co, letterSpacing: '-.01em' } },
        'afiet.co/blog · Sayma, dengele.',
      ),
    ) as never,
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: 'Nunito', data: extra as ArrayBuffer, weight: 800, style: 'normal' },
        { name: 'Nunito', data: black as ArrayBuffer, weight: 900, style: 'normal' },
      ],
      headers: {
        // Story payload denetçi revizesiyle değişebilir; kapaktan kısa tutulur.
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
  if (!wantsJpeg) return image

  // Satori/resvg yalnız PNG üretir; JPEG'i saf JS ile kendimiz kodlarız
  // (repoda native bağımlılık yok, @vercel/og'nin sınırı). 1080×1920 RGBA
  // ~8MB ham veri: serverless bellek için sorun değil.
  const png = await image.arrayBuffer()
  const decoded = UPNG.decode(png)
  const rgba = UPNG.toRGBA8(decoded)[0]
  if (!rgba) throw createError({ statusCode: 500, statusMessage: 'png_cozulemedi' })
  const jpeg = encodeJpeg(
    { data: new Uint8Array(rgba), width: decoded.width, height: decoded.height },
    90,
  )
  setHeader(event, 'content-type', 'image/jpeg')
  setHeader(event, 'cache-control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
  return new Uint8Array(jpeg.data)
})
