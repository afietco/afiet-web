<script setup lang="ts">
import type { SiteLocale } from '#shared/utils/locales'
import { authorProfile } from '#shared/utils/author'

/**
 * Görünür yazar künyesi: blog yazısının başlığının altında ve destek
 * yazısının sonunda aynı bileşen basar.
 *
 * Ad ve unvan shared/utils/author.ts'ten gelir; Person JSON-LD'si de (seoStore)
 * AYNI kaydı okur. Bu yüzden künye ile şema hiçbir zaman ayrışamaz - beslenme
 * YMYL bir alan ve "kim yazdı" cevabının ikisinde birden doğru olması gerek.
 *
 * Tarih/okuma süresi gibi yazıya özel bilgiler `meta` slot'undan gelir: onlar
 * yazarın değil yazının bilgisidir ve biçimlendirmesi sayfaya aittir.
 *
 * Avatar Afi'dir (kullanıcı kararı, 11 Ağu 2026). Person şemasına `image`
 * BASILMAZ: maskot yazarın fotoğrafı değildir, şemaya yazmak uydurma yapı olur.
 */
const props = withDefaults(
  defineProps<{
    /** 'Yazan' / 'Written by' - çevrilebilir sözcük, kopya dosyasından gelir. */
    prefix: string
    lang?: SiteLocale
    /** Destek yazısı gibi yerlerde daha küçük tipografi. */
    compact?: boolean
  }>(),
  { lang: 'tr', compact: false },
)

const author = computed(() => authorProfile(props.lang))
</script>

<template>
  <div class="flex items-center gap-3">
    <AfiMascot :class="compact ? 'h-8 w-8 shrink-0' : 'h-10 w-10 shrink-0'" aria-hidden="true" />
    <div class="min-w-0">
      <p :class="compact ? 'text-[13px] font-bold text-soft' : 'text-sm font-bold text-soft'">
        {{ prefix }}
        <NuxtLink
          :to="author.path"
          class="font-extrabold text-ink underline decoration-brand-mint decoration-2 underline-offset-4 transition hover:text-brand-deep"
          rel="author"
        >
          {{ author.name }}
        </NuxtLink>
        <span class="text-muted"> · {{ author.jobTitle }}</span>
      </p>
      <p v-if="$slots.meta" class="mt-0.5 text-xs font-bold text-muted">
        <slot name="meta" />
      </p>
    </div>
  </div>
</template>
