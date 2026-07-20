<script setup lang="ts">
import { blog } from '~/data/content'

// Meta/canonical panelden yönetilir (varsayılanlar kodda — seoDefaults.ts).
usePageSeo()

const { data } = useFetch('/api/blog/posts', {
  key: 'blog-posts',
  default: () => ({ posts: [] }),
})
const posts = computed(() => data.value?.posts ?? [])

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(iso),
      )
    : ''
</script>

<template>
  <section class="mx-auto max-w-3xl px-5 py-14 sm:py-20">
    <header>
      <p class="font-extrabold tracking-tight text-brand">{{ blog.eyebrow }}</p>
      <h1 class="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        {{ blog.title }}
      </h1>
      <p class="mt-4 max-w-xl text-[17px] leading-relaxed text-soft">{{ blog.sub }}</p>
      <a
        href="/blog/rss.xml"
        class="mt-3 inline-block text-sm font-bold text-muted transition hover:text-brand-deep"
        >{{ blog.rss }}</a
      >
    </header>

    <div v-if="posts.length" class="mt-10 grid gap-5">
      <NuxtLink
        v-for="p in posts"
        :key="p.slug"
        :to="`/blog/${p.slug}`"
        class="group block overflow-hidden rounded-3xl border border-line bg-surface shadow-lift transition hover:border-brand/40"
      >
        <!-- Kapak: kartın üstünde tam genişlik. alt="" bilinçli — başlık ve
             açıklama hemen altında, görsel onları tekrar eder. Kapaksız yazıda
             kart eskisi gibi yalnız metindir. -->
        <img
          v-if="p.coverUrl"
          :src="p.coverUrl"
          alt=""
          width="1200"
          height="630"
          loading="lazy"
          class="aspect-[1200/630] w-full border-b border-line object-cover"
        />
        <div class="p-6 sm:p-7">
          <p class="text-xs font-bold text-muted">
            <time v-if="p.publishedAt" :datetime="p.publishedAt">{{ fmtDate(p.publishedAt) }}</time>
            <template v-if="p.readingMinutes">
              · {{ p.readingMinutes }} {{ blog.readingSuffix }}</template
            >
          </p>
          <h2
            class="mt-2 text-xl font-extrabold tracking-tight text-ink transition group-hover:text-brand-deep sm:text-2xl"
          >
            {{ p.title }}
          </h2>
          <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ p.description }}</p>
          <p v-if="p.tags.length" class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="t in p.tags"
              :key="t"
              class="rounded-full bg-canvas px-3 py-1 text-xs font-bold text-soft"
              >{{ t }}</span
            >
          </p>
        </div>
      </NuxtLink>
    </div>

    <p
      v-else
      class="mt-10 rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center font-bold text-muted"
    >
      {{ blog.empty }}
    </p>
  </section>
</template>
