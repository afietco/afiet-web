/**
 * Sayfanın SEO meta'sını sunucudaki efektif ayarlardan çeker ve uygular
 * (panelden yönetilir; DB boşken kod varsayılanları döner). Sayfalardaki
 * elle useHead bloklarının yerini alır. Yanıt tipi Nitro route'undan
 * otomatik türetilir (ResolvedPageMeta).
 */
export function usePageSeo() {
  const route = useRoute()
  const path = route.path

  const { data: meta } = useFetch('/api/seo/meta', {
    params: { path },
    key: `seo-meta:${path}`,
    default: () => null,
  })

  useSeoMeta({
    title: () => meta.value?.title,
    description: () => meta.value?.description,
    ogTitle: () => meta.value?.ogTitle,
    ogDescription: () => meta.value?.ogDescription,
    ogImage: () => meta.value?.ogImage,
    ogImageAlt: () => meta.value?.ogImageAlt || undefined,
    ogUrl: () => meta.value?.ogUrl,
    ogSiteName: () => meta.value?.ogSiteName,
    ogLocale: () => meta.value?.ogLocale,
    ogType: () => meta.value?.ogType ?? 'website',
    articlePublishedTime: () => meta.value?.publishedAt || undefined,
    articleModifiedTime: () => meta.value?.modifiedAt || undefined,
    twitterCard: 'summary_large_image',
    twitterTitle: () => meta.value?.ogTitle,
    twitterDescription: () => meta.value?.ogDescription,
    twitterImage: () => meta.value?.ogImage,
    twitterSite: () => meta.value?.twitterSite || undefined,
    robots: () => meta.value?.robots || undefined,
  })

  useHead(() => ({
    link: meta.value ? [{ rel: 'canonical', href: meta.value.canonical, key: 'canonical' }] : [],
    meta: [
      ...(meta.value?.verification.google
        ? [{ name: 'google-site-verification', content: meta.value.verification.google }]
        : []),
      ...(meta.value?.verification.bing
        ? [{ name: 'msvalidate.01', content: meta.value.verification.bing }]
        : []),
      ...(meta.value?.verification.yandex
        ? [{ name: 'yandex-verification', content: meta.value.verification.yandex }]
        : []),
    ],
    // JSON-LD: JSON içindeki '<' kaçışlanır ki </script> enjeksiyonu imkânsız olsun.
    script: (meta.value?.jsonld ?? []).map((block, i) => ({
      type: 'application/ld+json',
      innerHTML: JSON.stringify(block).replace(/</g, '\\u003c'),
      key: `jsonld-${i}`,
    })),
  }))

  const faq = computed(() => meta.value?.faq ?? null)
  return { meta, faq }
}
