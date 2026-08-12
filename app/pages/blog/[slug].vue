<script setup lang="ts">
import { blog, bulten } from '~/data/content'

/**
 * Türkçe blog yazısı. Gövde `BlogYazi` bileşenindedir (/en/blog/<slug> ile
 * paylaşılır).
 *
 * `lang=tr` şart: İngilizce bir yazının slug'ı bu yoldan istenirse uç 404
 * döner ve sayfa gerçek 404 verir. Aynı içeriğin iki dilin yolunda birden
 * yaşaması duplicate ve yanlış dil çerçevesi demek olurdu.
 */
const route = useRoute()
const slug = String(route.params.slug ?? '')

const { data: post, error } = await useFetch(`/api/blog/posts/${slug}`, {
  key: `blog-post:tr:${slug}`,
  params: { lang: 'tr' },
})
if (error.value || !post.value) {
  // Gerçek 404: ISR/edge kopyası da 404 statüsüyle cache'lenir (soft-404 yok).
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: 'Yazı bulunamadı',
    fatal: true,
  })
}

// Meta/JSON-LD sunucuda çözülür (BlogPosting + Breadcrumb - seoStore).
usePageSeo()
</script>

<template>
  <BlogYazi v-if="post" :post="post" :copy="blog" :bulten="bulten" lang="tr" back-to="/blog" />
</template>
