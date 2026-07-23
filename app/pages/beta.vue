<script setup lang="ts">
import { beta } from '~/data/content'

usePageSeo()

// Kontenjanla birebir: 100 koltuk, medalyonun çevresinde iç içe halkalar.
// Toplam count 100 olmalı (29 + 27 + 24 + 20); halkalar arası yarım adım kaydırılır.
const rings = [
  { r: 46, count: 29, opacity: 0.9 },
  { r: 42.5, count: 27, opacity: 0.72 },
  { r: 39, count: 24, opacity: 0.55 },
  { r: 35.5, count: 20, opacity: 0.4 },
]
const seats = rings.flatMap((ring, ri) =>
  Array.from({ length: ring.count }, (_, i) => {
    const stagger = ri % 2 ? Math.PI / ring.count : 0
    const angle = (Math.PI * 2 * i) / ring.count - Math.PI / 2 + stagger
    return {
      x: 50 + Math.cos(angle) * ring.r,
      y: 50 + Math.sin(angle) * ring.r,
      opacity: ring.opacity,
    }
  }),
)
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden bg-brand-ink text-white">
      <div
        class="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style="background: radial-gradient(circle at 78% 35%, rgb(16 185 129 / 0.35), transparent 34%), radial-gradient(circle at 18% 90%, rgb(167 243 208 / 0.16), transparent 28%)"
      />
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
        style="background-image: linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px); background-size: 42px 42px"
      />

      <div class="relative mx-auto grid min-h-[720px] max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div class="max-w-2xl">
          <p class="rise text-sm font-extrabold tracking-[0.24em] text-brand-mint uppercase" style="--d: 0.05s">
            {{ beta.eyebrow }}
          </p>
          <h1 class="rise mt-5 text-5xl leading-[0.96] font-black tracking-[-0.045em] text-balance sm:text-7xl" style="--d: 0.12s">
            {{ beta.title }}
          </h1>
          <p class="rise mt-7 max-w-xl text-lg leading-8 font-semibold text-white/75 sm:text-xl" style="--d: 0.2s">
            {{ beta.sub }}
          </p>

          <div class="rise mt-9 flex flex-wrap gap-3" style="--d: 0.28s">
            <div class="rounded-2xl border border-white/15 bg-white/8 px-5 py-3 backdrop-blur-sm">
              <span class="block text-xs font-extrabold tracking-[0.18em] text-brand-mint uppercase">{{ beta.cohortLabel }}</span>
              <span class="mt-0.5 block text-xl font-black">{{ beta.cohortCount }} {{ beta.cohortSuffix }}</span>
            </div>
            <div class="flex items-center rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-base font-extrabold backdrop-blur-sm">
              {{ beta.platforms }}
            </div>
          </div>

          <div class="rise mt-9" style="--d: 0.36s">
            <a href="#beta-katil" class="btn-primary !bg-brand-bright !px-7 !py-3.5 hover:!bg-brand">
              {{ beta.cta }}
              <svg viewBox="0 0 20 20" class="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
            <p class="mt-4 max-w-md text-sm leading-6 font-semibold text-white/55">
              {{ beta.note }}
            </p>
          </div>
        </div>

        <div class="rise relative mx-auto w-full max-w-[520px]" style="--d: 0.22s">
          <div class="relative aspect-square rounded-full border border-white/15 bg-white/[0.06] shadow-[0_40px_90px_rgb(0_0_0/0.28)] backdrop-blur-sm">
            <svg viewBox="0 0 100 100" class="absolute inset-0 h-full w-full" aria-hidden="true">
              <circle cx="50" cy="50" r="34" fill="none" stroke="rgb(255 255 255 / 0.11)" stroke-width="0.35" />
              <circle cx="50" cy="50" r="49" fill="none" stroke="rgb(167 243 208 / 0.18)" stroke-width="0.3" stroke-dasharray="1.5 2" />
              <circle
                v-for="(seat, index) in seats"
                :key="index"
                :cx="seat.x"
                :cy="seat.y"
                r="1.6"
                fill="#a7f3d0"
                :opacity="seat.opacity"
              />
            </svg>

            <div class="absolute inset-[17%] flex flex-col items-center justify-center rounded-full border border-brand-mint/25 bg-brand-deep/80 text-center shadow-inner">
              <span class="text-[clamp(4.5rem,13vw,8rem)] leading-none font-black tracking-[-0.07em] text-brand-mint">
                {{ beta.cohortCount }}
              </span>
              <span class="mt-1 text-base font-extrabold tracking-[0.22em] text-white/70 uppercase">
                {{ beta.cohortSuffix }}
              </span>
              <span class="mt-3 h-px w-12 bg-brand-mint/40" />
              <span class="mt-3 text-sm font-bold text-white/55">{{ beta.motifLabel }}</span>
            </div>
          </div>

          <AfiMascot class="absolute -right-2 -bottom-5 h-28 w-28 rotate-3 shadow-2xl sm:h-36 sm:w-36" />
        </div>
      </div>
    </section>

    <section class="bg-canvas px-5 py-24 sm:py-28">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-3xl">
          <p class="text-sm font-extrabold tracking-[0.22em] text-brand uppercase">{{ beta.featuresEyebrow }}</p>
          <h2 class="mt-4 text-4xl leading-tight font-black tracking-[-0.035em] text-brand-ink sm:text-5xl">
            {{ beta.featuresTitle }}
          </h2>
          <p class="mt-5 max-w-2xl text-lg leading-8 font-semibold text-soft">{{ beta.featuresSub }}</p>
        </div>

        <div class="mt-14 grid gap-5 lg:grid-cols-3">
          <article
            v-for="feature in beta.features"
            :key="feature.key"
            class="group relative overflow-hidden rounded-[2rem] border border-line bg-surface p-7 shadow-[0_14px_40px_rgb(50_47_42/0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-8"
          >
            <div class="absolute top-0 right-0 h-28 w-28 rounded-bl-full bg-brand-mint/15 transition group-hover:bg-brand-mint/25" aria-hidden="true" />
            <p class="relative font-black tracking-[0.18em] text-brand">{{ feature.number }}</p>
            <h3 class="relative mt-16 text-2xl font-black tracking-[-0.025em] text-brand-ink">{{ feature.title }}</h3>
            <p class="relative mt-4 leading-7 font-semibold text-soft">{{ feature.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-5 pb-24 sm:pb-28">
      <div class="mx-auto grid max-w-6xl overflow-hidden rounded-[2.5rem] bg-brand-mint/30 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="relative flex min-h-[390px] items-end overflow-hidden bg-brand p-8 text-white sm:p-12">
          <div class="absolute -top-16 -right-16 h-64 w-64 rounded-full border-[42px] border-white/10" aria-hidden="true" />
          <div class="absolute top-20 left-10 h-20 w-20 rounded-full bg-brand-mint/20" aria-hidden="true" />
          <AfiMascot class="absolute top-10 right-8 h-28 w-28 -rotate-3 sm:h-36 sm:w-36" />
          <div class="relative">
            <p class="text-sm font-extrabold tracking-[0.2em] text-brand-mint uppercase">{{ beta.tester.eyebrow }}</p>
            <h2 class="mt-4 max-w-md text-4xl leading-tight font-black tracking-[-0.035em] sm:text-5xl">
              {{ beta.tester.title }}
            </h2>
            <p class="mt-5 max-w-md leading-7 font-semibold text-white/75">{{ beta.tester.intro }}</p>
          </div>
        </div>

        <div class="grid gap-10 p-8 sm:grid-cols-2 sm:p-12 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <h3 class="text-xl font-black text-brand-ink">{{ beta.tester.asksTitle }}</h3>
            <ul class="mt-6 space-y-4">
              <li v-for="item in beta.tester.asks" :key="item" class="flex gap-3 font-semibold text-soft">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
                  <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-xl font-black text-brand-ink">{{ beta.tester.promisesTitle }}</h3>
            <ul class="mt-6 space-y-4">
              <li v-for="item in beta.tester.promises" :key="item" class="flex gap-3 font-semibold text-soft">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-ink text-brand-mint" aria-hidden="true">
                  <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section id="beta-katil" class="relative scroll-mt-20 overflow-hidden bg-surface px-5 py-24 sm:py-28">
      <div class="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-6xl bg-line" aria-hidden="true" />
      <div class="mx-auto max-w-4xl text-center">
        <p class="text-sm font-extrabold tracking-[0.22em] text-brand uppercase">{{ beta.invite.eyebrow }}</p>
        <h2 class="mt-4 text-4xl leading-tight font-black tracking-[-0.04em] text-brand-ink sm:text-6xl">
          {{ beta.invite.title }}
        </h2>
        <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 font-semibold text-soft">{{ beta.invite.sub }}</p>

        <div class="mx-auto mt-9 grid max-w-xl grid-cols-2 gap-3 text-left">
          <div class="rounded-2xl border border-line bg-canvas p-4 sm:p-5">
            <p class="font-black text-brand-ink">{{ beta.invite.platformIos }}</p>
            <p class="mt-1 text-sm font-semibold text-muted">{{ beta.invite.platformIosSub }}</p>
          </div>
          <div class="rounded-2xl border border-line bg-canvas p-4 sm:p-5">
            <p class="font-black text-brand-ink">{{ beta.invite.platformAndroid }}</p>
            <p class="mt-1 text-sm font-semibold text-muted">{{ beta.invite.platformAndroidSub }}</p>
          </div>
        </div>

        <div class="mx-auto mt-9 max-w-2xl rounded-[2rem] border border-brand/15 bg-canvas p-5 shadow-lift sm:p-8">
          <BetaForm />
        </div>
      </div>
    </section>

    <section class="bg-canvas px-5 py-24 sm:py-28">
      <div class="mx-auto max-w-4xl">
        <div class="text-center">
          <p class="text-sm font-extrabold tracking-[0.22em] text-brand uppercase">{{ beta.faqEyebrow }}</p>
          <h2 class="mt-4 text-4xl font-black tracking-[-0.035em] text-brand-ink sm:text-5xl">{{ beta.faqTitle }}</h2>
        </div>

        <div class="mt-12 divide-y divide-line overflow-hidden rounded-[2rem] border border-line bg-surface px-6 sm:px-9">
          <details v-for="item in beta.faq" :key="item.q" class="group py-6">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-black text-brand-ink">
              {{ item.q }}
              <span class="relative h-6 w-6 shrink-0 rounded-full bg-brand-mint/40" aria-hidden="true">
                <span class="absolute top-1/2 left-1/2 h-0.5 w-3 -translate-1/2 rounded-full bg-brand-deep" />
                <span class="absolute top-1/2 left-1/2 h-3 w-0.5 -translate-1/2 rounded-full bg-brand-deep transition group-open:rotate-90 group-open:opacity-0" />
              </span>
            </summary>
            <p class="max-w-2xl pt-4 pr-10 leading-7 font-semibold text-soft">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>
