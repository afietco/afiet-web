<script setup lang="ts">
import { blog } from '~/data/content'

const route = useRoute()
const slug = String(route.params.slug ?? '')

const { data: post, error } = await useFetch(`/api/blog/posts/${slug}`, {
  key: `blog-post:${slug}`,
})
if (error.value || !post.value) {
  // Gerçek 404: ISR/edge kopyası da 404 statüsüyle cache'lenir (soft-404 yok).
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: 'Yazı bulunamadı',
    fatal: true,
  })
}

// Meta/JSON-LD sunucuda çözülür (BlogPosting + Breadcrumb — seoStore).
usePageSeo()

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(iso),
      )
    : ''
</script>

<template>
  <article v-if="post" class="mx-auto max-w-2xl px-5 py-14 sm:py-20">
    <header>
      <NuxtLink to="/blog" class="text-sm font-bold text-muted transition hover:text-brand-deep">
        {{ blog.back }}
      </NuxtLink>
      <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {{ post.title }}
      </h1>
      <p class="mt-3 text-sm font-bold text-muted">
        <time v-if="post.publishedAt" :datetime="post.publishedAt">{{
          fmtDate(post.publishedAt)
        }}</time>
        <template v-if="post.readingMinutes">
          · {{ post.readingMinutes }} {{ blog.readingSuffix }}</template
        >
      </p>
      <p v-if="post.tags.length" class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="t in post.tags"
          :key="t"
          class="rounded-full bg-surface px-3 py-1 text-xs font-bold text-soft shadow-lift"
          >{{ t }}</span
        >
      </p>
    </header>

    <!-- Kapak: alt="" bilinçli — başlık ve açıklama hemen yanında, görsel
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
    <div class="post-body mt-8" v-html="post.html" />

    <footer class="mt-12 border-t border-line pt-8">
      <p class="font-bold text-soft">
        afiet yakında App Store ve Google Play’de —
        <NuxtLink to="/#haber" class="font-extrabold text-brand transition hover:text-brand-deep"
          >çıkınca haber ver</NuxtLink
        >
      </p>
      <NuxtLink to="/blog" class="btn-ghost mt-6">{{ blog.back }}</NuxtLink>
    </footer>
  </article>
</template>

<style scoped>
/* Markdown gövdesi — typography eklentisi yok, tema tokenlarıyla elle. */
.post-body {
  color: var(--color-soft);
  font-size: 16.5px;
  line-height: 1.75;
}
.post-body :deep(h2) {
  margin: 2em 0 0.6em;
  color: var(--color-ink);
  font-size: 1.45em;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.post-body :deep(h3) {
  margin: 1.6em 0 0.5em;
  color: var(--color-ink);
  font-size: 1.15em;
  font-weight: 800;
  letter-spacing: -0.01em;
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
  margin: 1.2em 0;
  padding: 0.2em 1.2em;
  border-left: 3px solid var(--color-brand-mint);
  color: var(--color-ink);
  font-weight: 600;
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
