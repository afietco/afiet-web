<script setup lang="ts">
import type { HesapSilCopy } from '~/data/content'

/**
 * Hesap silme gövdesi: /hesap-sil (content.ts > hesapSil) ve
 * /en/delete-account (content.en.ts > deleteAccountEn) aynı bileşeni basar.
 * Bu sayfa mağaza gereksinimidir (App Store / Play, hesap silme adresi);
 * iki dilde de erişilebilir kalmak zorundadır.
 */
const props = withDefaults(
  defineProps<{ copy: HesapSilCopy & Partial<{ emailCta: string }> }>(),
  {},
)

const emailCta = computed(() => props.copy.emailCta ?? 'E-posta gönder')
</script>

<template>
  <article class="mx-auto max-w-2xl px-5 py-14 sm:py-20">
    <header class="border-b border-line pb-6">
      <p class="text-2xl font-extrabold tracking-tight text-brand">afiet</p>
      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-ink">{{ copy.title }}</h1>
    </header>

    <p class="mt-6 rounded-2xl bg-surface p-5 text-[15px] leading-relaxed text-soft shadow-lift">
      {{ copy.intro }}
    </p>

    <section class="mt-8">
      <h2 class="mb-3 text-lg font-extrabold tracking-tight text-ink">{{ copy.appTitle }}</h2>
      <ol class="flex flex-col gap-2">
        <li
          v-for="(step, i) in copy.steps"
          :key="i"
          class="flex gap-3 text-[15px] leading-relaxed text-soft"
        >
          <span
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint text-xs font-extrabold text-brand-ink"
          >
            {{ i + 1 }}
          </span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </section>

    <section class="mt-8">
      <h2 class="mb-2 text-lg font-extrabold tracking-tight text-ink">{{ copy.emailTitle }}</h2>
      <p class="text-[15px] leading-relaxed text-soft">{{ copy.emailBody }}</p>
      <a :href="`mailto:${copy.contact}`" class="btn-primary mt-5">{{ emailCta }}</a>
    </section>
  </article>
</template>
