<script setup lang="ts">
import { blog } from '~/data/content'

/**
 * Türkçe blog listesinin ikinci ve sonraki sayfaları: `/blog/sayfa/2`.
 *
 * NEDEN AYRI ROUTE (ve neden `?sayfa=2` DEĞİL): gerekçe ve Nitro'daki tam
 * satır `#shared/utils/sayfalama > sayfaYolu` başındadır - kısaca, Vercel
 * ISR fonksiyonu çağrıldığında Nitro `req.url`i yalnız `__isr_route`tan
 * kuruyor ve sorgu dizesini atıyor, yani sorgu tabanlı sayfalama sunucuda
 * hiç görünmüyordu.
 *
 * Birinci sayfa BURASI DEĞİL `/blog`tur; `/blog/sayfa/1` diye bir adres
 * bilinçli olarak yoktur (aynı içeriğin ikinci adresi olurdu).
 *
 * `/blog/[slug]` ile çakışmaz: o tek segment eşler, bu iki segment.
 */
const route = useRoute()
const istenenSayfa = computed(() => Number(route.params.sayfa))

usePageSeo()
</script>

<template>
  <BlogListe :copy="blog" lang="tr" :istenen-sayfa="istenenSayfa" />
</template>
