<script setup lang="ts">
import { support } from '~/data/content'
import { accentText } from '~/utils/supportAccent'
import type { SupportCategoryWithArticles } from '#shared/types/support'

/**
 * Yazı ve kategori sayfalarının sol menüsü: kategori ağacı, açık kategori
 * yazılarıyla birlikte. Konum hissi bu menüden gelir ("neredeyim, komşusu ne").
 *
 * Mobilde menü native <details> ile katlanır - sitedeki diğer katlanır
 * yüzeylerle (SSS, mobil menü) aynı sebep: JS çalışmasa da açılıp kapanır.
 *
 * Varsayılanlar bilinçli: 404 yolunda sayfa setup'ı yarıda kesildiğinde menü
 * gürültü çıkarmadan boş render etsin.
 */
const props = withDefaults(
  defineProps<{
    categories?: SupportCategoryWithArticles[]
    activeCategory?: string
    activeArticle?: string
  }>(),
  { categories: () => [], activeCategory: '' },
)

const filled = computed(() => props.categories.filter((c) => c.articles.length))
</script>

<template>
  <nav :aria-label="support.menuTitle">
    <!-- Masaüstü: hep açık ağaç -->
    <div class="hidden lg:block">
      <p class="mb-3 text-xs font-extrabold tracking-widest text-muted uppercase">
        {{ support.menuTitle }}
      </p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="c in filled" :key="c.slug">
          <NuxtLink
            :to="`/destek/${c.slug}`"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold tracking-tight transition"
            :class="
              c.slug === props.activeCategory
                ? 'bg-surface text-ink shadow-lift'
                : 'text-soft hover:bg-surface/70 hover:text-ink'
            "
          >
            <SupportIcon
              :name="c.icon"
              class="h-4 w-4 shrink-0"
              :class="c.slug === props.activeCategory ? accentText[c.accent] : 'text-muted'"
            />
            {{ c.title }}
          </NuxtLink>

          <!-- Yalnız açık kategorinin yazıları listelenir: ağaç tamamen açık
               olsa 100 satır olur ve konum hissi kaybolur. -->
          <ul
            v-if="c.slug === props.activeCategory"
            class="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l border-line pl-3"
          >
            <li v-for="a in c.articles" :key="a.slug">
              <NuxtLink
                :to="`/destek/${c.slug}/${a.slug}`"
                class="block rounded-lg px-2.5 py-1.5 text-sm transition"
                :class="
                  a.slug === props.activeArticle
                    ? 'font-extrabold text-brand-deep'
                    : 'font-semibold text-soft hover:text-ink'
                "
                :aria-current="a.slug === props.activeArticle ? 'page' : undefined"
              >
                {{ a.title }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <!-- Mobil ve tablet: katlanır -->
    <details class="support-menu rounded-3xl border border-line bg-surface lg:hidden">
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 font-extrabold tracking-tight text-ink [&::-webkit-details-marker]:hidden"
      >
        <span>{{ support.menuToggle }}</span>
        <span
          class="support-menu-caret grid h-7 w-7 shrink-0 place-items-center rounded-full bg-canvas text-brand transition duration-300"
          aria-hidden="true"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </summary>
      <ul class="flex flex-col gap-0.5 border-t border-line px-3 py-3">
        <li v-for="c in filled" :key="c.slug">
          <NuxtLink
            :to="`/destek/${c.slug}`"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold tracking-tight transition"
            :class="c.slug === props.activeCategory ? 'bg-canvas text-ink' : 'text-soft'"
          >
            <SupportIcon
              :name="c.icon"
              class="h-4 w-4 shrink-0"
              :class="c.slug === props.activeCategory ? accentText[c.accent] : 'text-muted'"
            />
            {{ c.title }}
          </NuxtLink>
          <ul
            v-if="c.slug === props.activeCategory"
            class="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l border-line pl-3"
          >
            <li v-for="a in c.articles" :key="a.slug">
              <NuxtLink
                :to="`/destek/${c.slug}/${a.slug}`"
                class="block rounded-lg px-2.5 py-1.5 text-sm transition"
                :class="
                  a.slug === props.activeArticle
                    ? 'font-extrabold text-brand-deep'
                    : 'font-semibold text-soft'
                "
                :aria-current="a.slug === props.activeArticle ? 'page' : undefined"
              >
                {{ a.title }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </details>
  </nav>
</template>

<style scoped>
.support-menu[open] .support-menu-caret {
  transform: rotate(180deg);
}
</style>
