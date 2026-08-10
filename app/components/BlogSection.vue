<script setup lang="ts">
import type { HomeBlogCopy } from '~/data/content'
import { blogPath } from '#shared/utils/locales'
import type { SiteLocale } from '#shared/utils/locales'

/**
 * Ana sayfadaki taze yazılar bölümü; / (Türkçe) ve /en aynı bileşeni basar,
 * kopya ve dil dışarıdan gelir (BlogListe ile aynı desen). Kart görünümü blog
 * listesindeki kartın sadeleşmiş halidir.
 *
 * Liste DİLE GÖRE süzülür: /en'de Türkçe yazı görünmez. Yazı yoksa bölüm HİÇ
 * görünmez; dev/staging'de blog tablosu boş başlar ve bu bir arıza değildir
 * (bkz. CLAUDE.md > Veritabanı).
 */
const props = defineProps<{ copy: HomeBlogCopy; lang: SiteLocale }>()

const { data } = useFetch('/api/blog/posts', {
  key: `home-blog-posts:${props.lang}`,
  params: { lang: props.lang },
  default: () => ({ posts: [] }),
})

/* publishedAt ISO/UTC olduğundan sözlük sırası = zaman sırası. */
const latest = computed(() =>
  (data.value?.posts ?? [])
    .filter((p) => p.publishedAt)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 3),
)

/* Hub yolu seoStore ile aynı kuraldan: yazı yolları blogPath'ten gelir. */
const hub = computed(() => (props.lang === 'en' ? '/en/blog' : '/blog'))

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat(props.lang === 'en' ? 'en-US' : 'tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso))
    : ''
</script>

<template>
  <section v-if="latest.length" aria-labelledby="blog-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="max-w-2xl">
          <p v-reveal class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
            <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
            {{ copy.eyebrow }}
          </p>
          <h2
            id="blog-baslik"
            v-reveal="80"
            class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
          >
            {{ copy.title }}
          </h2>
          <p v-reveal="140" class="mt-4 max-w-xl leading-relaxed font-semibold text-soft">
            {{ copy.sub }}
          </p>
        </div>
        <NuxtLink v-reveal="180" :to="hub" class="btn-ghost shrink-0">{{ copy.cta }}</NuxtLink>
      </div>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(p, i) in latest"
          :key="p.slug"
          v-reveal="i * 90"
          :to="blogPath(lang, p.slug)"
          class="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
        >
          <img
            v-if="p.coverUrl"
            :src="p.coverUrl"
            alt=""
            width="1200"
            height="630"
            loading="lazy"
            class="aspect-[1200/630] w-full border-b border-line object-cover"
          />
          <div class="flex flex-1 flex-col p-5">
            <p class="text-xs font-bold text-muted">
              <time v-if="p.publishedAt" :datetime="p.publishedAt">{{ fmtDate(p.publishedAt) }}</time>
              <template v-if="p.readingMinutes">
                · {{ p.readingMinutes }} {{ copy.readingSuffix }}</template
              >
            </p>
            <h3
              class="mt-2 font-display text-lg font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
            >
              {{ p.title }}
            </h3>
            <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-soft">{{ p.description }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
