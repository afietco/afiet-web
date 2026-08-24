<script setup lang="ts">
import {
  heroEn,
  homeBlogEn,
  measureChipsEn,
  originEn,
  storeBadgesEn,
  toolsEn,
  updatesEn,
  voiceEn,
  zagsEn,
  zagsIntroEn,
  type Accent,
} from '~/data/content.en'

/**
 * İngilizce vitrin (/en). Kurgu TR ana sayfanın çevirisi DEĞİLDİR; hibrit
 * konumlama kararına göre kurulur (5 Ağu 2026): evrensel açılış (hero + why),
 * Türk sofrası kökeni ikinci planda (origin), ses tonu (voice) ve dönüşüm
 * olarak indirme DEĞİL bülten (#updates, kullanıcı kararı: uygulama bugün
 * Türkçe, EN ziyaretçiye dürüstçe "on the way" denir).
 *
 * Bölüm markup'ları TR bileşenlerin (HeroSection, ZagSection, VoiceSection,
 * CtaSection) görsel dilini birebir taşır ama burada yaşar: TR bileşenleri
 * content.ts'e bağlı kalır ve EN kurgu onlardan bağımsız evrilebilir.
 * Meta + hreflang panel/sunucudan gelir (usePageSeo → /api/seo/meta).
 */
usePageSeo()

const dotClasses: Record<Accent, string> = {
  sebze: 'bg-sebze',
  meyve: 'bg-meyve',
  protein: 'bg-protein',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
}

const accentClasses: Record<Accent, string> = {
  sebze: 'bg-sebze/10 text-sebze',
  meyve: 'bg-meyve/10 text-meyve',
  protein: 'bg-protein/10 text-protein',
  tahil: 'bg-tahil/10 text-tahil',
  sut: 'bg-sut/10 text-sut',
}

const washClasses: Record<Accent, string> = {
  sebze: 'bg-sebze/10',
  meyve: 'bg-meyve/10',
  protein: 'bg-protein/10',
  tahil: 'bg-tahil/10',
  sut: 'bg-sut/10',
}

/* Çipler telefonun çevresine yüzde konumla dağılır (HeroSection ile aynı). */
const chipSpots = [
  'top-[6%] left-[3%] lg:-left-2',
  'top-[31%] right-[3%] lg:right-[-5%]',
  'bottom-[27%] left-[3%] lg:left-[-7%]',
  'bottom-[6%] right-[5%]',
]

/* Editoryal ritim ZagSection'la aynı: 12 kolonda 7/5, 5/7, 6/6. */
const spans = [
  'lg:col-span-7',
  'lg:col-span-5',
  'lg:col-span-5',
  'lg:col-span-7',
  'lg:col-span-6',
  'lg:col-span-6',
]

/* Balonlar hafif kaydırmalarla dizilir (VoiceSection ile aynı). */
const offsets = ['sm:ml-0', 'sm:ml-14', 'sm:ml-5', 'sm:ml-20']

/* Araç vitrini: kaynak toolsEn.tools (tek liste, iki görünüm - hub ile aynı). */
const SERIT: Record<string, string> = {
  sebze: 'bg-sebze',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
  protein: 'bg-protein',
}
</script>

<template>
  <!-- ── Hero ─────────────────────────────────────────────────────────── -->
  <section class="relative overflow-hidden" aria-labelledby="hero-title">
    <div class="pointer-events-none absolute -top-56 left-1/2 h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#fff3d6]/70 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute -top-40 -left-44 h-[34rem] w-[34rem] rounded-full bg-brand-mint/45 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute top-1/3 -right-52 h-[30rem] w-[30rem] rounded-full bg-[#fde68a]/45 blur-3xl" aria-hidden="true" />

    <div
      class="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pt-16 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24 lg:pb-20"
    >
      <div class="max-w-xl">
        <p
          class="rise inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-mint/30 px-4 py-1.5 text-sm font-extrabold text-brand-deep"
        >
          <span class="h-2 w-2 rounded-full bg-brand-bright" aria-hidden="true" />
          {{ heroEn.eyebrow }}
        </p>

        <!-- İngilizce başlık TR'den uzun; punto tavanı bu yüzden daha alçak. -->
        <h1
          id="hero-title"
          class="rise mt-6 font-display text-[clamp(2.9rem,7vw,4.9rem)] leading-[1.02] font-semibold tracking-[-0.02em] text-ink"
          style="--d: 80ms"
        >
          {{ heroEn.titleA }}<br />
          <span class="wonk relative inline-block pr-2 text-brand italic">
            {{ heroEn.titleB }}
            <svg
              class="absolute right-2 -bottom-2 left-0 h-4 w-[calc(100%-0.5rem)] text-brand-bright"
              viewBox="0 0 220 14"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M4 10 Q 56 3 108 7 T 216 6"
                fill="none"
                stroke="currentColor"
                stroke-width="6"
                stroke-linecap="round"
                opacity="0.55"
              />
            </svg>
          </span>
        </h1>

        <p class="rise mt-7 max-w-lg text-lg leading-relaxed font-semibold text-pretty text-soft sm:text-xl" style="--d: 160ms">
          {{ heroEn.sub }}
        </p>

        <div class="rise mt-9 flex flex-wrap items-center gap-3" style="--d: 240ms">
          <a href="#updates" class="btn-primary">{{ heroEn.ctaPrimary }}</a>
          <a href="#why" class="btn-ghost">{{ heroEn.ctaSecondary }}</a>
        </div>

        <div class="rise mt-9" style="--d: 320ms">
          <StoreBadges :soon-label="storeBadgesEn.soon" />
        </div>
      </div>

      <div class="rise relative" style="--d: 200ms">
        <div
          class="pointer-events-none absolute top-1/2 left-1/2 h-[30rem] w-[30rem] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand/15 motion-safe:animate-[spin_90s_linear_infinite] sm:h-[34rem] sm:w-[34rem]"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute top-1/2 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint/25 blur-2xl"
          aria-hidden="true"
        />

        <div class="animate-float">
          <div class="rotate-[1.5deg] transition-transform duration-500 hover:rotate-0">
            <PhoneMock />
          </div>
        </div>

        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <span
            v-for="(chip, i) in measureChipsEn"
            :key="chip.label"
            class="absolute flex animate-float items-center gap-2 rounded-full border border-line/80 bg-surface/90 px-4 py-2 text-sm font-extrabold text-ink shadow-lift backdrop-blur-sm"
            :class="chipSpots[i]"
            :style="{ animationDelay: `${-1.4 * (i + 1)}s`, rotate: `${[-4, 3, -3, 5][i]}deg` }"
          >
            <span class="h-2.5 w-2.5 rounded-full" :class="dotClasses[chip.accent]" />
            {{ chip.label }}
          </span>
        </div>
      </div>
    </div>
  </section>

  <!-- ── Why afiet? ───────────────────────────────────────────────────── -->
  <section id="why" class="scroll-mt-20" aria-labelledby="why-title">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div class="max-w-2xl">
        <p v-reveal class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
          <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
          {{ zagsIntroEn.eyebrow }}
        </p>
        <h2
          id="why-title"
          v-reveal="80"
          class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
        >
          {{ zagsIntroEn.title }}
        </h2>
      </div>

      <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
        <article
          v-for="(zag, i) in zagsEn"
          :key="zag.key"
          v-reveal="i * 90"
          class="group relative overflow-hidden rounded-[28px] border border-line bg-surface p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift sm:p-8"
          :class="spans[i]"
        >
          <span
            class="pointer-events-none absolute -top-4 right-3 font-display text-[5.5rem] leading-none font-semibold text-ink/[0.05] italic select-none"
            aria-hidden="true"
          >
            0{{ i + 1 }}
          </span>
          <span
            class="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full blur-2xl"
            :class="washClasses[zag.accent]"
            aria-hidden="true"
          />

          <div class="relative">
            <div
              class="flex h-13 w-13 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
              :class="accentClasses[zag.accent]"
            >
              <ZagIcon :name="zag.key as 'denge' | 'sofra' | 'afi' | 'ritim' | 'aile' | 'sefkat'" />
            </div>
            <h3 class="mt-5 font-display text-2xl font-semibold tracking-tight">{{ zag.title }}</h3>
            <p class="mt-2.5 max-w-md leading-relaxed font-semibold text-soft">{{ zag.body }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- ── Born at the Turkish table (hibritin ikinci planı) ───────────── -->
  <section aria-labelledby="origin-title">
    <div class="mx-auto max-w-6xl px-5 pb-24">
      <div
        v-reveal
        class="relative overflow-hidden rounded-[36px] border border-line bg-surface px-6 py-14 sm:rounded-[48px] sm:px-12 md:px-16"
      >
        <div class="pointer-events-none absolute -top-20 -right-24 h-64 w-64 rounded-full bg-[#fde68a]/35 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-brand-mint/30 blur-3xl" aria-hidden="true" />

        <div class="relative grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
              <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
              {{ originEn.eyebrow }}
            </p>
            <h2
              id="origin-title"
              class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
            >
              {{ originEn.title }}
            </h2>
          </div>
          <div class="space-y-5">
            <p
              v-for="(p, i) in originEn.body"
              :key="i"
              v-reveal="i * 90"
              class="text-lg leading-relaxed font-semibold text-soft"
            >
              {{ p }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── Calculators ──────────────────────────────────────────────────── -->
  <section aria-labelledby="tools-title">
    <div class="mx-auto max-w-6xl px-5 pb-24">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="max-w-xl">
          <p v-reveal class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
            <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
            {{ toolsEn.eyebrow }}
          </p>
          <h2
            id="tools-title"
            v-reveal="80"
            class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
          >
            {{ toolsEn.title }}
          </h2>
        </div>
        <NuxtLink v-reveal="120" to="/en/tools" class="btn-ghost">{{ toolsEn.toolsTitle }} →</NuxtLink>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="(tool, i) in toolsEn.tools"
          :key="tool.to"
          v-reveal="i * 80"
          :to="tool.to"
          class="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pl-7 shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
        >
          <span class="absolute inset-y-0 left-0 w-1.5" :class="SERIT[tool.accent]" aria-hidden="true" />
          <h3
            class="font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
          >
            {{ tool.title }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-soft">{{ tool.body }}</p>
        </NuxtLink>
      </div>
    </div>
  </section>

  <!-- ── Tone of voice ────────────────────────────────────────────────── -->
  <section aria-labelledby="voice-title">
    <div class="mx-auto max-w-6xl px-5">
      <div
        class="relative overflow-hidden rounded-[36px] bg-brand-ink px-6 py-16 sm:rounded-[48px] sm:px-12 md:px-16 md:py-20"
      >
        <div class="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-brand-bright/20 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -right-20 -bottom-28 h-80 w-80 rounded-full bg-brand-deep/40 blur-3xl" aria-hidden="true" />

        <div class="relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p v-reveal class="text-sm font-extrabold tracking-wide text-brand-bright uppercase">
              {{ voiceEn.eyebrow }}
            </p>
            <h2
              id="voice-title"
              v-reveal="80"
              class="mt-3 font-display text-4xl font-semibold tracking-[-0.015em] text-white sm:text-5xl"
            >
              {{ voiceEn.title }}
            </h2>
            <p v-reveal="160" class="mt-4 text-lg leading-relaxed font-semibold text-brand-mint">
              {{ voiceEn.sub }}
            </p>
          </div>

          <ul class="space-y-4" role="list">
            <li
              v-for="(message, i) in voiceEn.messages"
              :key="message"
              v-reveal="i * 130"
              class="flex max-w-md items-end gap-2.5"
              :class="offsets[i]"
            >
              <AfiMascot class="h-8 w-8 shrink-0" />
              <p
                class="rounded-3xl rounded-bl-md bg-surface px-5 py-3 font-bold text-ink shadow-lift"
              >
                {{ message }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- ── Taze yazılar ─────────────────────────────────────────────────────
       TR ana sayfadaki şeridin aynısı (BlogSection, dile göre süzülür). Bu
       bölüm 10 Ağu 2026'da eklendi: /en'den bloga tek giriş menüdeki linkti,
       yani en güçlü İngilizce sayfadan yazılara hiç iç bağlantı akmıyordu.
       İngilizce yazı yoksa bölüm kendini gizler. -->
  <BlogSection :copy="homeBlogEn" lang="en" />

  <!-- ── Updates: indirme değil bülten (kullanıcı kararı) ─────────────── -->
  <section id="updates" class="scroll-mt-20" aria-labelledby="updates-title">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div
        v-reveal
        class="relative mx-auto max-w-3xl overflow-hidden rounded-[40px] border border-line bg-surface px-6 py-14 text-center shadow-lift sm:px-14 sm:py-16"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-mint/20 via-transparent to-[#fde68a]/25"
          aria-hidden="true"
        />
        <div class="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-mint/30 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#fde68a]/35 blur-3xl" aria-hidden="true" />

        <div class="relative">
          <div class="relative mx-auto h-24 w-24">
            <div
              class="pointer-events-none absolute top-1/2 left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand/20 motion-safe:animate-[spin_60s_linear_infinite]"
              aria-hidden="true"
            />
            <AfiMascot class="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-float" />
          </div>

          <p class="mt-9 text-sm font-extrabold tracking-wide text-brand uppercase">
            {{ updatesEn.eyebrow }}
          </p>
          <h2
            id="updates-title"
            class="mt-3 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
          >
            {{ updatesEn.title }}
          </h2>
          <p class="mx-auto mt-4 max-w-lg text-lg leading-relaxed font-semibold text-soft">
            {{ updatesEn.sub }}
          </p>

          <div class="mx-auto mt-9 max-w-md">
            <BultenForm source="en-home" lang="en" />
          </div>
          <p class="mx-auto mt-4 max-w-sm text-sm font-semibold text-muted">{{ updatesEn.note }}</p>

          <div class="mt-9 flex justify-center">
            <StoreBadges size="lg" :soon-label="storeBadgesEn.soon" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
