import { ImageResponse } from '@vercel/og'
import { getPublishedPost } from '~~/server/utils/contentStore'
import { dataUri, LOGO_SVG, motifSvg, MOTIFS, type MotifKey } from '~~/server/utils/kapakSvg'

/**
 * Blog kapağı, istekte çizilir: /kapak/<slug>.png
 *
 * NEDEN DİNAMİK: kapaklar bu tarihe kadar afiet-brand'de elle tasarlanıp
 * headless Chrome ile basılıyor, `public/covers/`e kopyalanıp main deploy'u
 * bekliyordu. O yol içerik hattından erişilemez (brand reposu yalnız yerelde,
 * Cloud Run'da Chrome yok, statik asset deploy gerektirir) ve kendi tuzağını
 * taşıyordu: asset canlı olmadan yayınlanan yazı kırık görsel veriyordu.
 * Burada kapak veriden türetildiği için o sıralama derdi tamamen kalkıyor.
 *
 * Elle tasarlanmış kapaklar KALDIRILMADI: `cover_url` dolu olan yazılar onu
 * kullanmaya devam eder (seoStore), bu rota yalnız boş olanları karşılar.
 * Yazıya özel illüstrasyon her zaman daha iyidir; bu, olmadığında sessizce
 * kapaksız kalmamak içindir.
 */

const BG = '#fdfaf3'
const INK = '#022c22'
const BODY = '#322f2a'
const MUTED = '#605a4f'
const FAINT = '#97907f'
const EMERALD = '#059669'
const LINE = '#ece4d4'

/**
 * Satori React beklediği için elementleri elle kuruyoruz (repoda React yok).
 *
 * Satori, birden fazla çocuğu olan her kabın `display`ini AÇIKÇA ister ve
 * eksikse tüm render'ı hataya düşürür. Tek tek yazmak yerine varsayılanı
 * burada veriyoruz: bu düzende zaten her kap flex.
 */
const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => {
  const style = (props.style ?? {}) as Record<string, unknown>
  return {
    type,
    props: {
      ...props,
      ...(type === 'img' ? {} : { style: { display: 'flex', ...style } }),
      children: children.length === 1 ? children[0] : children,
    },
  }
}

/**
 * Başlığın son parçasını vurgular: marka kapaklarında başlığın bir bölümü
 * emerald yazılır ve cümleye vurgu düşer. İki kelimeden kısa başlıkta vurgu
 * yapılmaz, yoksa tek kelime tamamen yeşile döner.
 */
function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/)
  if (words.length < 3) return [title, '']
  const cut = Math.max(1, words.length - 2)
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}

/** Uzun başlık kapağa sığmaz; punto kelime sayısına göre iner. */
const titleSize = (title: string) => (title.length > 58 ? 46 : title.length > 42 ? 52 : 58)

/**
 * Metni KELİME SINIRINDA kırpar. Karakter sayısından kesmek "günü etkileyen
 * sıcakl" gibi yarım kelimeler bırakıyordu; kapak markanın yüzü, orada yarım
 * kelime durmaz.
 */
function shorten(text: string, max: number): string {
  const clean = text.trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`
}

function isMotif(v: string): v is MotifKey {
  return v in MOTIFS
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') ?? '').replace(/\.png$/, '')
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    throw createError({ statusCode: 400, statusMessage: 'gecersiz_slug' })

  const post = await getPublishedPost(event, slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'yazi_bulunamadi' })

  const q = getQuery(event)
  const motif: MotifKey = typeof q.motif === 'string' && isMotif(q.motif) ? q.motif : 'sofra'
  const tag = typeof q.etiket === 'string' && q.etiket.trim() ? q.etiket.trim().slice(0, 24) : 'afiet blog'

  const [head, accent] = splitTitle(post.title)
  const sub = shorten(post.description.split(/(?<=[.!?])\s/)[0] ?? '', 92)
  const chips = post.tags.slice(0, 3)

  // Nunito'nun DEĞİŞKEN dosyası değil, statik örnekleri: Satori'nin opentype
  // ayrıştırıcısı fvar tablosunda düşüyor (`parseFvarAxis` undefined). İki
  // ağırlık repoda duruyor ve `fontTools.varLib.instancer` ile üretildi.
  const store = useStorage('assets:server')
  const [bold, extra] = await Promise.all([
    store.getItemRaw('fonts/Nunito-Bold.ttf'),
    store.getItemRaw('fonts/Nunito-ExtraBold.ttf'),
  ])
  if (!bold || !extra) throw createError({ statusCode: 500, statusMessage: 'font_yok' })

  return new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
          background: BG, fontFamily: 'Nunito', position: 'relative', padding: '40px 56px 34px',
        },
      },
      // Sofra ışığı: marka şablonunda blur'lu daireler, burada radial-gradient
      // (Satori CSS filtresi çizemez, sonuç göz için aynı yumuşaklıkta).
      h('div', {
        style: {
          position: 'absolute', top: '-260px', right: '-200px', width: '620px', height: '620px',
          backgroundImage: 'radial-gradient(circle, rgba(167,243,208,0.55) 0%, rgba(167,243,208,0) 70%)',
        },
      }),
      h('div', {
        style: {
          position: 'absolute', bottom: '-260px', left: '-180px', width: '560px', height: '560px',
          backgroundImage: 'radial-gradient(circle, rgba(251,146,60,0.16) 0%, rgba(251,146,60,0) 70%)',
        },
      }),
      // Üst şerit: marka + etiket
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
          h('img', { src: dataUri(LOGO_SVG), width: 56, height: 56 }),
          h('div', { style: { fontSize: '40px', fontWeight: 800, color: EMERALD, letterSpacing: '-.04em' } }, 'afiet'),
        ),
        h(
          'div',
          {
            style: {
              fontSize: '22px', fontWeight: 700, color: EMERALD, background: 'rgba(167,243,208,0.18)',
              border: `2px solid #a7f3d0`, borderRadius: '999px', padding: '9px 20px', display: 'flex',
            },
          },
          tag,
        ),
      ),
      // Sahne: solda söz, sağda çizim
      h(
        'div',
        { style: { flex: 1, display: 'flex', alignItems: 'center', gap: '20px' } },
        h(
          'div',
          { style: { flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '6px' } },
          h(
            'div',
            {
              style: {
                display: 'flex', flexWrap: 'wrap', fontSize: `${titleSize(post.title)}px`, fontWeight: 800,
                color: INK, letterSpacing: '-.045em', lineHeight: 1.06,
              },
            },
            // Ham metinle elementi aynı kapta karıştırmak Satori'de hataya
            // düşüyor; iki parça da kendi span'ında durur.
            h('span', { style: { display: 'flex' } }, `${head} `),
            h('span', { style: { display: 'flex', color: EMERALD } }, accent),
          ),
          sub
            ? h('div', { style: { display: 'flex', fontSize: '25px', fontWeight: 700, color: MUTED, marginTop: '16px', lineHeight: 1.32, maxWidth: '15.6em' } }, sub)
            : h('div', {}),
          chips.length
            ? h(
                'div',
                { style: { display: 'flex', gap: '10px', marginTop: '20px' } },
                ...chips.map((c) =>
                  h('div', {
                    style: {
                      display: 'flex', fontSize: '19px', fontWeight: 700, color: MUTED, background: '#fff',
                      border: `2px solid ${LINE}`, borderRadius: '999px', padding: '7px 16px',
                    },
                  }, c),
                ),
              )
            : h('div', {}),
        ),
        h(
          'div',
          { style: { width: '440px', display: 'flex', justifyContent: 'center', alignItems: 'center' } },
          h('img', { src: dataUri(motifSvg(motif)), width: 430, height: 430 }),
        ),
      ),
      // Alt şerit
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '20px', fontWeight: 700, color: FAINT } },
        h('div', { style: { display: 'flex', color: BODY } }, 'afiet.co/blog'),
        h(
          'div',
          { style: { display: 'flex', gap: '8px' } },
          h('span', { style: { color: EMERALD, fontWeight: 800 } }, 'Sayma, dengele.'),
          h('span', {}, '· afiet.co'),
        ),
      ),
    ) as never,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Nunito', data: bold as ArrayBuffer, weight: 700, style: 'normal' },
        { name: 'Nunito', data: extra as ArrayBuffer, weight: 800, style: 'normal' },
      ],
      headers: {
        // Kapak yalnız yazı değiştiğinde değişir; CDN'de uzun tutulur.
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
})
