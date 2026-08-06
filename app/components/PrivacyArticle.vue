<script setup lang="ts">
import type { PrivacyCopy } from '~/data/content'

/**
 * Gizlilik politikası gövdesi: /gizlilik (content.ts > privacy) ve
 * /en/privacy (content.en.ts > privacyEn) aynı bileşeni basar. EN'e özgü
 * alanlar opsiyoneldir ve boşken TR varsayılanına düşer.
 *
 * Metindeki URL'ler gerçek bağlantıya çevrilir. v-html KULLANILMAZ: gövde
 * panelden yönetilebilen metin, ham HTML'e izin vermek istemiyoruz. Bunun
 * yerine paragraf parçalara ayrılıp bağlantılar bileşen olarak basılıyor.
 *
 * Cloudflare, Turnstile'ı invisible modda kullanmanın ŞARTI olarak Turnstile
 * Gizlilik Ek Metni'ne atıf istiyor; o atfın tıklanabilir olması gerekiyor.
 */
const props = withDefaults(
  defineProps<{
    copy: PrivacyCopy &
      Partial<{ effectiveLabel: string; deleteCta: string; deleteTo: string }>
  }>(),
  {},
)

const effectiveLabel = computed(() => props.copy.effectiveLabel ?? 'Yürürlük')
const deleteCta = computed(() => props.copy.deleteCta ?? 'Hesabını sil →')
const deleteTo = computed(() => props.copy.deleteTo ?? '/hesap-sil')

// Bölme için g bayrağı şart (yakalama grubu ayırıcıyı da döndürsün diye), ama
// test için AYRI ve bayraksız bir kalıp kullanılıyor: g bayraklı bir regex
// .test() çağrıları arasında lastIndex tutar ve sonuçlar dönüşümlü çıkar.
const URL_SPLIT = /(https?:\/\/[^\s)]+)/g
const IS_URL = /^https?:\/\//

function parts(text: string) {
  return text.split(URL_SPLIT).map((chunk) => ({
    text: chunk,
    href: IS_URL.test(chunk) ? chunk.replace(/[.,;]$/, '') : '',
  }))
}
</script>

<template>
  <article class="mx-auto max-w-2xl px-5 py-14 sm:py-20">
    <header class="border-b border-line pb-6">
      <p class="text-2xl font-extrabold tracking-tight text-brand">afiet</p>
      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-ink">{{ copy.title }}</h1>
      <p class="mt-1 text-sm text-muted">{{ effectiveLabel }}: {{ copy.effective }}</p>
    </header>

    <p class="mt-6 rounded-2xl bg-surface p-5 text-[15px] leading-relaxed text-soft shadow-lift">
      {{ copy.intro }}
    </p>

    <section v-for="s in copy.sections" :key="s.title" class="mt-8">
      <h2 class="mb-2 text-lg font-extrabold tracking-tight text-ink">{{ s.title }}</h2>
      <p v-for="(p, i) in s.body" :key="i" class="mb-2 text-[15px] leading-relaxed text-soft">
        <template v-for="(part, j) in parts(p)" :key="j">
          <a
            v-if="part.href"
            :href="part.href"
            rel="noopener noreferrer"
            target="_blank"
            class="text-brand-deep underline underline-offset-2 hover:text-brand"
            >{{ part.href }}</a
          >
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </section>

    <NuxtLink :to="deleteTo" class="btn-ghost mt-10">{{ deleteCta }}</NuxtLink>
  </article>
</template>
