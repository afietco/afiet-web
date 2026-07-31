<script setup lang="ts">
import { destek } from '~/data/content'
import { aksanMetin } from '~/utils/destekAksan'
import type { DestekKategoriDolu } from '#shared/types/destek'

/**
 * Yazı ve kategori sayfalarının sol menüsü: kategori ağacı, açık kategori
 * yazılarıyla birlikte. Konum hissi bu menüden gelir ("neredeyim, komşusu ne").
 *
 * Mobilde menü native <details> ile katlanır - sitedeki diğer katlanır
 * yüzeylerle (SSS, mobil menü) aynı sebep: JS çalışmasa da açılıp kapanır.
 */
// Varsayılanlar bilinçli: 404 yolunda sayfa setup'ı yarıda kesildiğinde menü
// gürültü çıkarmadan boş render etsin.
const props = withDefaults(
  defineProps<{
    kategoriler?: DestekKategoriDolu[]
    aktifKategori?: string
    aktifYazi?: string
  }>(),
  { kategoriler: () => [], aktifKategori: '' },
)

const doluKategoriler = computed(() => props.kategoriler.filter((k) => k.yazilar.length))
</script>

<template>
  <nav :aria-label="destek.menuTitle">
    <!-- Masaüstü: hep açık ağaç -->
    <div class="hidden lg:block">
      <p class="mb-3 text-xs font-extrabold tracking-widest text-muted uppercase">
        {{ destek.menuTitle }}
      </p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="k in doluKategoriler" :key="k.slug">
          <NuxtLink
            :to="`/destek/${k.slug}`"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold tracking-tight transition"
            :class="
              k.slug === props.aktifKategori
                ? 'bg-surface text-ink shadow-lift'
                : 'text-soft hover:bg-surface/70 hover:text-ink'
            "
          >
            <DestekIkon
              :name="k.ikon"
              class="h-4 w-4 shrink-0"
              :class="k.slug === props.aktifKategori ? aksanMetin[k.aksan] : 'text-muted'"
            />
            {{ k.baslik }}
          </NuxtLink>

          <!-- Yalnız açık kategorinin yazıları listelenir: ağaç tamamen açık
               olsa 100 satır olur ve konum hissi kaybolur. -->
          <ul v-if="k.slug === props.aktifKategori" class="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l border-line pl-3">
            <li v-for="y in k.yazilar" :key="y.slug">
              <NuxtLink
                :to="`/destek/${k.slug}/${y.slug}`"
                class="block rounded-lg px-2.5 py-1.5 text-sm transition"
                :class="
                  y.slug === props.aktifYazi
                    ? 'font-extrabold text-brand-deep'
                    : 'font-semibold text-soft hover:text-ink'
                "
                :aria-current="y.slug === props.aktifYazi ? 'page' : undefined"
              >
                {{ y.baslik }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <!-- Mobil ve tablet: katlanır -->
    <details class="destek-menu rounded-3xl border border-line bg-surface lg:hidden">
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 font-extrabold tracking-tight text-ink [&::-webkit-details-marker]:hidden"
      >
        <span>{{ destek.menuToggle }}</span>
        <span
          class="destek-menu-ok grid h-7 w-7 shrink-0 place-items-center rounded-full bg-canvas text-brand transition duration-300"
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
        <li v-for="k in doluKategoriler" :key="k.slug">
          <NuxtLink
            :to="`/destek/${k.slug}`"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold tracking-tight transition"
            :class="k.slug === props.aktifKategori ? 'bg-canvas text-ink' : 'text-soft'"
          >
            <DestekIkon
              :name="k.ikon"
              class="h-4 w-4 shrink-0"
              :class="k.slug === props.aktifKategori ? aksanMetin[k.aksan] : 'text-muted'"
            />
            {{ k.baslik }}
          </NuxtLink>
          <ul v-if="k.slug === props.aktifKategori" class="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l border-line pl-3">
            <li v-for="y in k.yazilar" :key="y.slug">
              <NuxtLink
                :to="`/destek/${k.slug}/${y.slug}`"
                class="block rounded-lg px-2.5 py-1.5 text-sm transition"
                :class="
                  y.slug === props.aktifYazi
                    ? 'font-extrabold text-brand-deep'
                    : 'font-semibold text-soft'
                "
                :aria-current="y.slug === props.aktifYazi ? 'page' : undefined"
              >
                {{ y.baslik }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </details>
  </nav>
</template>

<style scoped>
.destek-menu[open] .destek-menu-ok {
  transform: rotate(180deg);
}
</style>
