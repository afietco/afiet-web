<script setup lang="ts">
/**
 * Site başlığı. Mobilde bağlantılar gizliydi ve yalnız CTA görünüyordu, yani
 * telefondan gelen biri "Neden afiet?" ve "Blog" sayfalarına hiç ulaşamıyordu.
 *
 * Menü native <details> ile kuruldu, JS durumuyla değil: bu sitede SSS de aynı
 * sebeple <details> (FaqSection.vue) ve sitenin hiç üçüncü taraf script'i yok.
 * JS çalışmasa da menü açılıp kapanır.
 *
 * Yol değişince menü kapanmalı; <details> bunu kendiliğinden yapmaz.
 */
const menu = useTemplateRef<HTMLDetailsElement>('menu')
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    if (menu.value) menu.value.open = false
  },
)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line/60 bg-canvas/75 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
      <NuxtLink to="/" class="flex items-center gap-2.5" aria-label="afiet ana sayfa">
        <AfiMascot class="h-9 w-9" />
        <span class="text-2xl font-extrabold tracking-tight text-brand">afiet</span>
      </NuxtLink>

      <!-- Dört link + CTA (kullanıcı kararı). sm-md arası dar olduğundan
           boşluk ve punto kademelidir; linkler sm'de görünür ki hamburger
           yalnız gerçek mobilde kalsın. -->
      <nav class="flex items-center gap-2 sm:gap-4 md:gap-6" aria-label="Sayfa içi">
        <NuxtLink
          to="/#neden"
          class="hidden text-[15px] font-bold text-soft transition hover:text-brand-deep sm:block md:text-base"
        >
          Neden afiet?
        </NuxtLink>
        <NuxtLink
          to="/blog"
          class="hidden text-[15px] font-bold text-soft transition hover:text-brand-deep sm:block md:text-base"
        >
          Blog
        </NuxtLink>
        <NuxtLink
          to="/hesapla"
          class="hidden text-[15px] font-bold text-soft transition hover:text-brand-deep sm:block md:text-base"
        >
          Hesapla
        </NuxtLink>
        <NuxtLink
          to="/yenilikler"
          class="hidden text-[15px] font-bold text-soft transition hover:text-brand-deep sm:block md:text-base"
        >
          Yenilikler
        </NuxtLink>
        <NuxtLink to="/beta" class="btn-primary !px-5 !py-2.5 text-sm">Beta’ya katıl</NuxtLink>

        <!-- Mobil menü, yalnız küçük ekranda. -->
        <details ref="menu" class="site-menu relative sm:hidden">
          <summary
            class="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-brand/40 [&::-webkit-details-marker]:hidden"
            aria-label="Menü"
          >
            <svg class="menu-open h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <svg class="menu-close h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </summary>

          <div
            class="absolute right-0 z-50 mt-3 flex w-56 flex-col gap-1 rounded-3xl border border-line bg-surface p-2 shadow-float"
          >
            <NuxtLink
              to="/#neden"
              class="rounded-2xl px-4 py-3 font-bold text-ink transition hover:bg-canvas hover:text-brand-deep"
            >
              Neden afiet?
            </NuxtLink>
            <NuxtLink
              to="/#sss"
              class="rounded-2xl px-4 py-3 font-bold text-ink transition hover:bg-canvas hover:text-brand-deep"
            >
              Sık sorulanlar
            </NuxtLink>
            <NuxtLink
              to="/blog"
              class="rounded-2xl px-4 py-3 font-bold text-ink transition hover:bg-canvas hover:text-brand-deep"
            >
              Blog
            </NuxtLink>
            <NuxtLink
              to="/hesapla"
              class="rounded-2xl px-4 py-3 font-bold text-ink transition hover:bg-canvas hover:text-brand-deep"
            >
              Hesapla
            </NuxtLink>
            <NuxtLink
              to="/yenilikler"
              class="rounded-2xl px-4 py-3 font-bold text-ink transition hover:bg-canvas hover:text-brand-deep"
            >
              Yenilikler
            </NuxtLink>
            <!-- Destek merkezi masaüstü menüde YOKTUR (kullanıcı kararı):
                 oradaki giriş kapıları alt bilgi, ana sayfadaki SSS bağlantıları
                 ve arama motorlarıdır. Mobilde alt bilgiye inmek zahmetli
                 olduğu için menüde durur. -->
            <NuxtLink
              to="/destek"
              class="rounded-2xl px-4 py-3 font-bold text-ink transition hover:bg-canvas hover:text-brand-deep"
            >
              Destek
            </NuxtLink>
            <!-- "Beta'ya katıl" menüye KONMAZ: düğmesi hemen yanında duruyor,
                 aynı çağrıyı iki kez göstermek menüyü kalabalıklaştırır. -->
          </div>
        </details>
      </nav>
    </div>
  </header>
</template>

<style scoped>
/* Açıkken çarpı, kapalıyken hamburger. */
.site-menu .menu-close,
.site-menu[open] .menu-open {
  display: none;
}
.site-menu[open] .menu-close {
  display: block;
}
</style>
