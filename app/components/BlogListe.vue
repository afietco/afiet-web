<script setup lang="ts">
import type { BlogCopy } from '~/data/content'
import { blogPath } from '#shared/utils/locales'
import type { SiteLocale } from '#shared/utils/locales'

/**
 * Blog liste sayfasının gövdesi; /blog (Türkçe) ve /en/blog (İngilizce) aynı
 * bileşeni basar, kopya ve dil dışarıdan gelir.
 *
 * Liste DİLE GÖRE süzülür (`/api/blog/posts?lang=`): bir dilin listesinde
 * öteki dilin yazısı görünmez. Arama ve sıralama tamamen istemcidedir, filtre
 * bilinçli olarak yoktur.
 */
const props = defineProps<{ copy: BlogCopy; lang: SiteLocale }>()

const { data } = await useFetch('/api/blog/posts', {
  key: `blog-posts:${props.lang}`,
  params: { lang: props.lang },
  default: () => ({ posts: [] }),
})
const posts = computed(() => data.value?.posts ?? [])

// 3 sütun × 3 satır: bir sayfada en çok 9 kart.
const PAGE_SIZE = 9

const query = ref('')
const sort = ref<'yeni' | 'eski'>('yeni')
const page = ref(1)

/* Küçük harfe çevirme dile bağlıdır: Türkçede "I" → "ı" olmalı. */
const locale = computed(() => (props.lang === 'en' ? 'en-US' : 'tr-TR'))
const norm = (s: string) => s.toLocaleLowerCase(locale.value)

const filtered = computed(() => {
  const q = norm(query.value.trim())
  const list = q
    ? posts.value.filter((p) => [p.title, p.description, ...p.tags].some((t) => norm(t).includes(q)))
    : posts.value.slice()
  const dir = sort.value === 'yeni' ? -1 : 1
  // publishedAt ISO/UTC olduğundan sözlük sırası = zaman sırası; boş tarih sona.
  return list.sort((a, b) => {
    if (!a.publishedAt || !b.publishedAt) return Number(!a.publishedAt) - Number(!b.publishedAt)
    return dir * a.publishedAt.localeCompare(b.publishedAt)
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

watch([query, sort], () => {
  page.value = 1
})
watch(pageCount, (n) => {
  if (page.value > n) page.value = n
})

const listTop = ref<HTMLElement | null>(null)
function goPage(n: number) {
  if (n < 1 || n > pageCount.value || n === page.value) return
  page.value = n
  nextTick(() => listTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const rssHref = computed(() => (props.lang === 'en' ? '/en/blog/rss.xml' : '/blog/rss.xml'))
const idPrefix = computed(() => (props.lang === 'en' ? 'blog-en' : 'blog'))

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso))
    : ''
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 py-14 sm:py-20">
    <header>
      <p class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
        <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
        {{ copy.eyebrow }}
      </p>
      <h1 class="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
        {{ copy.title }}
      </h1>
      <p class="mt-4 max-w-xl text-[17px] leading-relaxed text-soft">{{ copy.sub }}</p>
      <a
        :href="rssHref"
        class="mt-3 inline-block text-sm font-bold text-muted transition hover:text-brand-deep"
        >{{ copy.rss }}</a
      >
    </header>

    <div v-if="posts.length" ref="listTop" class="mt-10 scroll-mt-24">
      <!-- Araç çubuğu: arama + sıralama. Filtre bilinçli olarak yok. -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="sr-only" :for="`${idPrefix}-ara`">{{ copy.searchLabel }}</label>
        <div class="relative flex-1">
          <svg
            class="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            :id="`${idPrefix}-ara`"
            v-model="query"
            type="search"
            :placeholder="copy.searchPlaceholder"
            class="w-full rounded-full border border-line bg-surface py-3 pr-5 pl-11 font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </div>
        <label class="sr-only" :for="`${idPrefix}-sirala`">{{ copy.sortLabel }}</label>
        <div class="relative sm:w-auto">
          <select
            :id="`${idPrefix}-sirala`"
            v-model="sort"
            class="w-full appearance-none rounded-full border border-line bg-surface py-3 pr-11 pl-5 font-semibold text-ink transition focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          >
            <option value="yeni">{{ copy.sortNew }}</option>
            <option value="eski">{{ copy.sortOld }}</option>
          </select>
          <svg
            class="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <div v-if="paged.length" class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="p in paged"
          :key="p.slug"
          :to="blogPath(lang, p.slug)"
          class="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
        >
          <!-- Kapak: kartın üstünde tam genişlik. alt="" bilinçli - başlık ve
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
          <div class="flex flex-1 flex-col p-5">
            <p class="text-xs font-bold text-muted">
              <time v-if="p.publishedAt" :datetime="p.publishedAt">{{
                fmtDate(p.publishedAt)
              }}</time>
              <template v-if="p.readingMinutes">
                · {{ p.readingMinutes }} {{ copy.readingSuffix }}</template
              >
            </p>
            <h2
              class="mt-2 font-display text-lg font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
            >
              {{ p.title }}
            </h2>
            <p class="mt-2 line-clamp-3 text-sm leading-relaxed text-soft">{{ p.description }}</p>
            <p v-if="p.tags.length" class="mt-auto flex flex-wrap gap-1.5 pt-4">
              <span
                v-for="t in p.tags"
                :key="t"
                class="rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-soft"
                >{{ t }}</span
              >
            </p>
          </div>
        </NuxtLink>
      </div>

      <p
        v-else
        class="mt-6 rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center font-bold text-muted"
      >
        {{ copy.noResults }}
      </p>

      <nav
        v-if="pageCount > 1"
        :aria-label="copy.pagesLabel"
        class="mt-10 flex items-center justify-center gap-2"
      >
        <button
          type="button"
          :aria-label="copy.pagePrev"
          :disabled="page === 1"
          class="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-soft transition hover:border-brand/40 hover:text-brand-deep disabled:pointer-events-none disabled:opacity-40"
          @click="goPage(page - 1)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <button
          v-for="n in pageCount"
          :key="n"
          type="button"
          :aria-current="n === page ? 'page' : undefined"
          class="h-10 w-10 rounded-full border text-sm font-bold transition"
          :class="
            n === page
              ? 'border-brand bg-brand text-white shadow-lift'
              : 'border-line bg-surface text-soft hover:border-brand/40 hover:text-brand-deep'
          "
          @click="goPage(n)"
        >
          {{ n }}
        </button>
        <button
          type="button"
          :aria-label="copy.pageNext"
          :disabled="page === pageCount"
          class="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-soft transition hover:border-brand/40 hover:text-brand-deep disabled:pointer-events-none disabled:opacity-40"
          @click="goPage(page + 1)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </nav>
    </div>

    <p
      v-else
      class="mt-10 rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center font-bold text-muted"
    >
      {{ copy.empty }}
    </p>
  </section>
</template>
