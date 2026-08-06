<script setup lang="ts">
import { bulten, footer } from '~/data/content'
import { bultenEn, footerEn } from '~/data/content.en'

/**
 * Kendi bülten kutusu olan sayfada bant gizlenir (kullanıcı kararı, 5 Ağu
 * 2026): blog yazısının sonunda ve /iletisim'de bağlama özel kutu var, aynı
 * formu alt alta iki kez basmak tekrar göze batıyordu. /blog listesi bantlı
 * kalır; kutu yalnız yazı sayfasındadır. /en (ana dönüşümü #updates'teki
 * form) ve /en/contact da aynı sebeple gizler.
 *
 * /en altında bant ve alt bilgi İngilizce konuşur; bülten kaydı lang='en'
 * ile düşer ki İngilizce duyuru yalnız o listeye gitsin. Sosyal ikonlar ve
 * marka satırı iki dilde aynıdır.
 */
const route = useRoute()
const bandGizli = computed(
  () =>
    route.path === '/iletisim' ||
    route.path === '/en' ||
    route.path === '/en/contact' ||
    /^\/blog\/./.test(route.path),
)

const { locale } = useSiteLocale()
const en = computed(() => locale.value === 'en')
const band = computed(() => (en.value ? bultenEn : bulten))
const alt = computed(() =>
  en.value
    ? { tagline: footerEn.tagline, signoff: footerEn.signoff, links: footerEn.links }
    : { tagline: footer.tagline, signoff: footer.signoff, links: footer.links },
)
</script>

<template>
  <footer class="border-t border-line/70">
    <!-- Bülten bandı: alt bilginin hemen üstünde.
         Landing'in e-posta toplama istisnası (content.ts > bulten). -->
    <div v-if="!bandGizli" class="border-b border-line/70 bg-surface/60">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="max-w-md">
          <p class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
            <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
            {{ band.eyebrow }}
          </p>
          <p class="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {{ band.title }}
          </p>
          <p class="mt-1.5 text-sm leading-relaxed font-semibold text-soft">{{ band.sub }}</p>
        </div>
        <BultenForm source="footer" :lang="locale" class="w-full sm:max-w-sm" />
      </div>
    </div>

    <div
      class="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 sm:flex-row sm:justify-between"
    >
      <div class="flex items-center gap-2.5">
        <AfiMascot class="h-8 w-8" />
        <div class="leading-tight">
          <div class="font-extrabold tracking-tight text-brand">afiet</div>
          <div class="text-xs font-bold text-muted">{{ alt.tagline }}</div>
        </div>
      </div>
      <div class="flex flex-col items-center gap-4">
        <nav
          class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          :aria-label="en ? 'Footer links' : 'Alt bağlantılar'"
        >
          <NuxtLink
            v-for="l in alt.links"
            :key="l.to"
            :to="l.to"
            class="text-sm font-bold text-muted transition hover:text-brand-deep"
          >
            {{ l.label }}
          </NuxtLink>
        </nav>
        <!-- Dış profiller ikon sırası (kullanıcı kararı, 5 Ağu 2026);
             adres listesi ve sameAs uyarısı content.ts > footer.social'da. -->
        <SocialIcons />
      </div>
      <p class="text-sm font-bold text-muted">
        <span class="font-display text-base font-medium text-soft italic">{{ alt.signoff }}</span>
        · © {{ new Date().getFullYear() }} afiet
      </p>
    </div>
  </footer>
</template>
