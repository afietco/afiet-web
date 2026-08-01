<script setup lang="ts">
import { releases as copy } from '~/data/content'

/**
 * Tek sürümün notları. Gövde SUNUCUDA markdown-it ile (html:false) üretilmiş
 * güvenli HTML'dir; blog ve destekteki sözleşmenin aynısı, v-html güvenliği
 * buna dayanır.
 *
 * Bilinmeyen sürüm markalı hata sayfasına DÜŞMEZ, kendi cümlesini kurar: bu
 * adrese en çok uygulamadaki Yenilikler sayfasından gelinir ve orada eksik bir
 * bağlantı kalmışsa insanın karşılaştığı şey açıklama artı çıkış olmalı.
 * Yanıt yine de 404'tür, yani arama motoru bu sayfayı gerçek sanmaz.
 *
 * O ekranın içeriği ÇEKİLEN VERİYE BAĞLI OLAMAZ: 404 dönen bir belgede
 * istemci hidrasyonda sunucunun verisini kullanmıyor, yani sunucuda basılan
 * her liste ilk render'da boşalıp uyumsuzluk üretiyor. Sabit metin + çıkış
 * bağlantısı bu yüzden.
 */
const route = useRoute()
const version = String(route.params.version ?? '')

const { data } = await useFetch(`/api/yenilikler/${version}`, {
  key: `surum:${version}`,
})

const release = computed(() => data.value?.release ?? null)

if (!release.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

// Meta ve JSON-LD sunucuda çözülür (seoStore.resolvePageMeta).
usePageSeo()

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
</script>

<template>
  <section class="mx-auto max-w-3xl px-5 py-12 sm:py-16">
    <NuxtLink
      to="/yenilikler"
      class="text-sm font-bold text-muted transition hover:text-brand-deep"
    >
      {{ copy.back }}
    </NuxtLink>

    <template v-if="release">
      <header class="mt-6">
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span class="rounded-full bg-brand px-3 py-1 text-sm font-extrabold text-white">
            v{{ release.version }}
          </span>
          <time :datetime="release.date" class="text-sm font-bold text-muted">
            {{ formatDate(release.date) }}
          </time>
          <span v-if="release.total" class="text-sm font-bold text-muted">
            · {{ release.total }} {{ copy.changesSuffix }}
          </span>
        </p>
        <h1
          class="mt-4 font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-4xl"
        >
          {{ release.title }}
        </h1>
        <p v-if="release.summary" class="mt-3 text-[17px] leading-relaxed text-soft">
          {{ release.summary }}
        </p>
      </header>

      <!-- Gövde: sunucuda üretilmiş güvenli HTML -->
      <div class="surum-govde mt-8" v-html="release.html" />

      <nav
        v-if="release.newer || release.older"
        class="mt-12 grid gap-3 sm:grid-cols-2"
        aria-label="Diğer sürümler"
      >
        <NuxtLink
          v-if="release.older"
          :to="`/yenilikler/${release.older.version}`"
          class="group rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/40 sm:order-1"
        >
          <p class="text-xs font-extrabold tracking-wide text-muted">{{ copy.olderLabel }}</p>
          <p
            class="mt-1 font-display font-semibold text-ink transition group-hover:text-brand-deep"
          >
            v{{ release.older.version }} · {{ release.older.title }}
          </p>
        </NuxtLink>
        <NuxtLink
          v-if="release.newer"
          :to="`/yenilikler/${release.newer.version}`"
          class="group rounded-2xl border border-line bg-surface p-4 text-right transition hover:border-brand/40 sm:order-2"
        >
          <p class="text-xs font-extrabold tracking-wide text-muted">{{ copy.newerLabel }}</p>
          <p
            class="mt-1 font-display font-semibold text-ink transition group-hover:text-brand-deep"
          >
            v{{ release.newer.version }} · {{ release.newer.title }}
          </p>
        </NuxtLink>
      </nav>

      <div class="mt-10 rounded-3xl border border-line bg-surface p-6">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ copy.updateTitle }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-soft">{{ copy.updateBody }}</p>
        <NuxtLink
          :to="copy.updateTo"
          class="mt-4 inline-block font-extrabold text-brand transition hover:text-brand-deep"
        >
          {{ copy.updateLinkLabel }}
        </NuxtLink>
      </div>
    </template>

    <template v-else>
      <header class="mt-6">
        <h1
          class="font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-4xl"
        >
          {{ copy.notFoundTitle }}
        </h1>
        <p class="mt-3 text-[17px] leading-relaxed text-soft">{{ copy.notFoundBody }}</p>
      </header>
      <NuxtLink
        to="/yenilikler"
        class="mt-8 inline-block rounded-full bg-brand px-6 py-3 font-extrabold text-white shadow-lift transition hover:bg-brand-deep"
      >
        {{ copy.notFoundCta }}
      </NuxtLink>
    </template>
  </section>
</template>

<style scoped>
/* Sürüm gövdesi: destek yazısının (.destek-govde) daha kısa ritimli sürümü.
   Bölüm başlıkları yalnız üç tane olduğu için üstlerinde ince bir ayraç var,
   maddeler ise uzun cümlelerdir - satır aralığı ona göre açık. */
.surum-govde {
  color: var(--color-soft);
  font-size: 16.5px;
  line-height: 1.72;
}
.surum-govde :deep(h2) {
  margin: 2.2em 0 0.6em;
  padding-top: 1.1em;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.35em;
  font-weight: 600;
  letter-spacing: -0.015em;
}
.surum-govde :deep(h2:first-child) {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}
.surum-govde :deep(p) {
  margin: 0.9em 0;
}
.surum-govde :deep(ul) {
  margin: 0.9em 0;
  padding-left: 1.3em;
  list-style: disc;
}
.surum-govde :deep(ul li) {
  margin: 0.6em 0;
}
.surum-govde :deep(ul li::marker) {
  color: var(--color-brand);
}
.surum-govde :deep(strong) {
  color: var(--color-ink);
  font-weight: 800;
}
.surum-govde :deep(a) {
  color: var(--color-brand-deep);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-brand-mint);
}
.surum-govde :deep(a:hover) {
  text-decoration-color: var(--color-brand);
}
</style>
