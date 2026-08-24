<script setup lang="ts">
import type { BlogCopy } from '~/data/content'
import type { SiteLocale } from '#shared/utils/locales'

/**
 * Blog yazısının gövdesi; /blog/<slug> ve /en/blog/<slug> aynı bileşeni basar.
 * Yazıyı SAYFA çeker ve bulunamazsa 404'ü sayfa fırlatır (rota davranışı orada
 * kalsın diye); burası yalnız gösterim.
 *
 * Yazı sonundaki çağrı dile göre değişir: Türkçe okuru /indir'e, İngilizce
 * okuru bültene davet eder (uygulama bugün Türkçe).
 */
const props = defineProps<{
  post: {
    title: string
    tags: string[]
    coverUrl: string | null
    publishedAt: string | null
    /** Yayın tarihinden farklıysa künyede "son güncelleme" olarak görünür. */
    updatedAt?: string | null
    readingMinutes: number | null
    html: string
  }
  copy: BlogCopy & Partial<{ endLead: string; endCta: string; endTo: string }>
  bulten: { blogTitle: string; blogSub: string }
  lang: SiteLocale
  backTo: string
}>()

const fmtDate = (iso: string | null, lang: SiteLocale) =>
  iso
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso))
    : ''

/* Güncelleme tarihi yalnız yayın GÜNÜNDEN farklıysa gösterilir: her yayında
   saat düzeyinde değişen bir alanı künyeye basmak "bugün güncellendi" gibi
   yanlış bir tazelik iddiası olurdu. */
const updated = computed(() => {
  const u = props.post.updatedAt
  if (!u) return null
  const day = (iso: string) => iso.slice(0, 10)
  return props.post.publishedAt && day(u) === day(props.post.publishedAt) ? null : u
})
</script>

<template>
  <article class="mx-auto max-w-2xl px-5 py-14 sm:py-20">
    <header>
      <NuxtLink :to="backTo" class="text-sm font-bold text-muted transition hover:text-brand-deep">
        {{ copy.back }}
      </NuxtLink>
      <h1 class="mt-4 font-display text-4xl leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2.75rem]">
        {{ post.title }}
      </h1>
      <!-- Yazar künyesi: yazının kim tarafından yazıldığı okumaya başlamadan
           görünür. Ad/unvan shared/utils/author.ts'ten; aynı kayıt Person
           JSON-LD'sini de besliyor (seoStore), yani ikisi ayrışamaz. -->
      <YazarSatiri :prefix="copy.authorPrefix" :lang="lang" class="mt-5">
        <template #meta>
          <time v-if="post.publishedAt" :datetime="post.publishedAt">{{
            fmtDate(post.publishedAt, lang)
          }}</time>
          <template v-if="post.readingMinutes">
            · {{ post.readingMinutes }} {{ copy.readingSuffix }}</template
          >
          <template v-if="updated">
            · {{ copy.updatedPrefix }}:
            <time :datetime="updated">{{ fmtDate(updated, lang) }}</time>
          </template>
        </template>
      </YazarSatiri>
      <p v-if="post.tags.length" class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="t in post.tags"
          :key="t"
          class="rounded-full bg-surface px-3 py-1 text-xs font-bold text-soft shadow-lift"
          >{{ t }}</span
        >
      </p>
    </header>

    <!-- Kapak: alt="" bilinçli - başlık ve açıklama hemen yanında, görsel
         onları tekrar eder. width/height CLS'i keser, LCP olduğu için lazy yok. -->
    <img
      v-if="post.coverUrl"
      :src="post.coverUrl"
      alt=""
      width="1200"
      height="630"
      class="mt-8 aspect-[1200/630] w-full rounded-2xl border border-line object-cover"
    />

    <!-- Gövde: sunucuda markdown-it (html:false) ile üretilmiş güvenli HTML. -->
    <!-- eslint-disable-next-line vue/no-v-html -- sunucuda html:false ile üretildi -->
    <div class="post-body mt-8" v-html="post.html" />

    <footer class="mt-12 border-t border-line pt-8">
      <!-- Yazar kartı: metni bitiren okurun "bunu yazan kim" sorusu tam burada
           doğar; bülten kutusundan ÖNCE durur ki güven sorusu çağrıdan önce
           cevaplansın. -->
      <YazarKarti
        :title="copy.authorCardTitle"
        :cta="copy.authorCardCta"
        :lang="lang"
        class="mb-6"
      />

      <!-- Yazıyı bitiren okur en sıcak kitledir: bülten kutusu burada durur. -->
      <div class="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ bulten.blogTitle }}
        </h2>
        <p class="mt-1.5 text-sm leading-relaxed font-semibold text-soft">{{ bulten.blogSub }}</p>
        <BultenForm :source="lang === 'en' ? 'en-blog' : 'blog'" :lang="lang" class="mt-4" />
      </div>

      <p class="mt-8 font-bold text-soft">
        {{ copy.endLead ?? 'afiet App Store’da:' }}
        <NuxtLink
          :to="copy.endTo ?? '/indir'"
          class="font-extrabold text-brand transition hover:text-brand-deep"
          >{{ copy.endCta ?? 'sofrada yerini ayır' }}</NuxtLink
        >
      </p>
      <NuxtLink :to="backTo" class="btn-ghost mt-6">{{ copy.back }}</NuxtLink>
    </footer>
  </article>
</template>

<style scoped>
/* Markdown gövdesi - typography eklentisi yok, tema tokenlarıyla elle. */
.post-body {
  color: var(--color-soft);
  font-size: 16.5px;
  line-height: 1.75;
}
.post-body :deep(h2) {
  margin: 2em 0 0.6em;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.55em;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
.post-body :deep(h3) {
  margin: 1.6em 0 0.5em;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.2em;
  font-weight: 600;
  letter-spacing: -0.01em;
}
/* Editoryal giriş: ilk paragrafın ilk harfi Fraunces gömme başlık (drop cap).
   Künye 11 Ağu 2026'da gövdeden ÇIKARILDI (artık YazarSatiri bileşeninde ve
   tek kaynağı shared/utils/author.ts), yani normalde ilk paragraf gerçek
   paragraftır ve ikinci kural çalışır. Birinci kural DURUYOR: yayındaki
   yazılar yeniden yayınlanana kadar veritabanındaki gövdelerde künye satırı
   (`*Yazan: …*`, tek bir <em>) hâlâ var ve onun "Y"si dev harf olmamalı. */
.post-body :deep(> p:first-child:has(> em:only-child) + p)::first-letter,
.post-body :deep(> p:first-child:not(:has(> em:only-child)))::first-letter {
  float: left;
  margin: 0.06em 0.14em 0 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 3.1em;
  font-weight: 600;
  line-height: 0.85;
}

/* Künye: gövdeden ayrışsın, gömme başlığın komşusu olarak sıkışmasın. */
.post-body :deep(> p:first-child:has(> em:only-child)) {
  margin-bottom: 1.4em;
  color: var(--color-muted);
  font-size: 0.92em;
}
.post-body :deep(p) {
  margin: 0.9em 0;
}
.post-body :deep(a) {
  color: var(--color-brand-deep);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-brand-mint);
}
.post-body :deep(a:hover) {
  text-decoration-color: var(--color-brand);
}
.post-body :deep(ul),
.post-body :deep(ol) {
  margin: 0.9em 0;
  padding-left: 1.4em;
}
.post-body :deep(ul) {
  list-style: disc;
}
.post-body :deep(ol) {
  list-style: decimal;
}
.post-body :deep(li) {
  margin: 0.35em 0;
}
.post-body :deep(strong) {
  color: var(--color-ink);
  font-weight: 800;
}
.post-body :deep(blockquote) {
  margin: 1.4em 0;
  padding: 0.2em 1.2em;
  border-left: 3px solid var(--color-brand-mint);
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.08em;
  font-style: italic;
  font-weight: 500;
}
.post-body :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.9em;
}
.post-body :deep(hr) {
  margin: 2em 0;
  border: 0;
  border-top: 1px solid var(--color-line);
}
.post-body :deep(img) {
  max-width: 100%;
  border-radius: 16px;
}
.post-body :deep(table) {
  width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  font-size: 0.92em;
}
.post-body :deep(th),
.post-body :deep(td) {
  padding: 0.5em 0.7em;
  border: 1px solid var(--color-line);
  text-align: left;
}
.post-body :deep(th) {
  background: var(--color-surface);
  color: var(--color-ink);
}
</style>
