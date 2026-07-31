<script setup lang="ts">
import { support } from '~/data/content'
import { accentText, accentWash } from '~/utils/supportAccent'

/**
 * Kategori sayfası: başlığın altındaki tüm yazıların listesi, solda kategori
 * ağacı, üstte kırıntı yolu ve arama. Yazı sayfasıyla aynı iskelet, tek fark
 * ortadaki içerik.
 */
const route = useRoute()
const categorySlug = String(route.params.kategori ?? '')

usePageSeo()

const { data } = await useFetch('/api/destek', {
  key: 'destek-harita',
  default: () => ({ categories: [], total: 0 }),
})

const categories = computed(() => data.value?.categories ?? [])
const category = computed(() => categories.value.find((c) => c.slug === categorySlug) ?? null)

// Bilinmeyen kategori gerçek 404 verir (soft-404 yok).
if (!category.value) {
  throw createError({ statusCode: 404, statusMessage: 'Başlık bulunamadı', fatal: true })
}
</script>

<template>
  <div v-if="category" class="mx-auto max-w-7xl px-5 py-10 sm:py-14">
    <div class="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <!-- Sol: kategori ağacı (masaüstünde yapışkan) -->
      <aside class="mb-8 lg:mb-0">
        <div class="lg:sticky lg:top-24">
          <SupportNav :categories="categories" :active-category="categorySlug" />
        </div>
      </aside>

      <div class="min-w-0">
        <nav aria-label="Kırıntı yolu" class="text-sm font-bold text-muted">
          <NuxtLink to="/destek" class="transition hover:text-brand-deep">
            {{ support.breadcrumbRoot }}
          </NuxtLink>
          <span class="mx-1.5" aria-hidden="true">›</span>
          <span class="text-soft">{{ category.title }}</span>
        </nav>

        <header class="mt-4 flex items-start gap-4">
          <span
            class="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl sm:grid"
            :class="[accentWash[category.accent], accentText[category.accent]]"
            aria-hidden="true"
          >
            <SupportIcon :name="category.icon" class="h-8 w-8" />
          </span>
          <div>
            <h1 class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
              {{ category.title }}
            </h1>
            <p class="mt-2 max-w-xl leading-relaxed text-soft">{{ category.description }}</p>
          </div>
        </header>

        <div class="mt-7 max-w-xl">
          <SupportSearch size="small" />
        </div>

        <ul v-if="category.articles.length" class="mt-8 flex flex-col gap-2.5">
          <li v-for="a in category.articles" :key="a.slug">
            <NuxtLink
              :to="`/destek/${category.slug}/${a.slug}`"
              class="group flex items-start gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition hover:border-brand/40 hover:shadow-lift"
            >
              <span class="min-w-0 flex-1">
                <span
                  class="block font-extrabold tracking-tight text-ink transition group-hover:text-brand-deep"
                >
                  {{ a.title }}
                </span>
                <span v-if="a.summary" class="mt-1 block text-sm leading-relaxed text-soft">
                  {{ a.summary }}
                </span>
              </span>
              <svg
                class="mt-1 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
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
            </NuxtLink>
          </li>
        </ul>

        <p
          v-else
          class="mt-8 rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center font-bold text-muted"
        >
          {{ support.emptyCategory }}
        </p>

        <div class="mt-10 rounded-3xl border border-line bg-surface px-6 py-5">
          <p class="font-extrabold tracking-tight text-ink">{{ support.stuckTitle }}</p>
          <p class="mt-1.5 text-sm leading-relaxed text-soft">{{ support.stuckBody }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <NuxtLink to="/destek#afiye-sor" class="btn-primary !px-5 !py-2.5 text-sm">
              {{ support.stuckAskCta }}
            </NuxtLink>
            <a :href="`mailto:${support.contactMail}`" class="btn-ghost !px-5 !py-2.5 text-sm">
              {{ support.contactMail }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
