/**
 * İngilizce blogda yayında yazı var mı?
 *
 * Boş bir liste sayfasını menüde göstermeyiz (kullanıcı kararı, 6 Ağu 2026);
 * link ancak ilk İngilizce yazı yayınlandığında belirir. Aynı kural
 * sitemap'te (`sitemap.xml.get.ts`) ve llms.txt'de de uygulanır.
 *
 * Maliyeti yok denecek kadar az: uç zaten 60 sn bellek cache'li, `/en` sayfaları
 * ISR ile render ediliyor ve paylaşılan anahtar sayesinde başlık ile alt bilgi
 * tek istek yapar (liste sayfası da aynı anahtarı kullanır).
 */
export function useEnBlog() {
  const { data } = useFetch('/api/blog/posts', {
    key: 'blog-posts:en',
    params: { lang: 'en' },
    default: () => ({ posts: [] }),
  })
  const hasPosts = computed(() => (data.value?.posts?.length ?? 0) > 0)
  return { hasPosts }
}
