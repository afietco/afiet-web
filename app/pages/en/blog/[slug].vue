<script setup lang="ts">
import { blogEn, bultenEn } from '~/data/content.en'

/**
 * İngilizce blog yazısı (/en/blog/<slug>). Gövde `BlogYazi` bileşeninde.
 *
 * `lang=en` şart: Türkçe bir yazının slug'ı bu yoldan istenirse uç 404 döner
 * ve sayfa gerçek 404 verir; İngilizce çerçevede Türkçe yazı basılmaz.
 * Yazının Türkçe karşılığı varsa (veritabanında `translation_of`) hreflang
 * çifti sunucuda üretilir - seoStore.
 */
const route = useRoute()
const slug = String(route.params.slug ?? '')

const { data: post, error } = await useFetch(`/api/blog/posts/${slug}`, {
  key: `blog-post:en:${slug}`,
  params: { lang: 'en' },
})
if (error.value || !post.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: 'Post not found',
    fatal: true,
  })
}

usePageSeo()
</script>

<template>
  <BlogYazi
    v-if="post"
    :post="post"
    :copy="blogEn"
    :bulten="bultenEn"
    lang="en"
    back-to="/en/blog"
  />
</template>
