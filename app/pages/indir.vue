<script setup lang="ts">
import { indir } from '~/data/content'

/**
 * İndirme sayfası (/indir). 24 Ağu 2026'da `/beta`nın yerini aldı: uygulama
 * App Store'da yayına girdi, beta kapandı (eski adres 301 ile buraya taşınır,
 * `seoDefaults > DEFAULT_REDIRECTS`).
 *
 * NEDEN DOĞRUDAN MAĞAZAYA GİTMİYOR: sitedeki her birincil çağrı buraya bakar
 * ve ziyaretçilerin bir kısmı Android'de ya da masaüstünde. Doğrudan App
 * Store'a atmak Android'liyi anlamsız bir yere düşürürdü; burada iki mağaza da
 * yan yana durur, biri bağlantı biri "yolda" etiketi
 * (`StoreBadges` her rozeti kendi bayrağına bakarak basar).
 *
 * Sayfa aynı zamanda "afiet" marka aramasının inişidir, yani gelen herkes yeni
 * kullanıcı değil: uygulamayı zaten indirmiş olana destek merkezi ve sürüm
 * notları bağlantısı görünür bir bölümde durur.
 */
usePageSeo()
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
        class="pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden="true"
        style="background-image: linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px); background-size: 42px 42px"
      />

      <div class="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div class="max-w-2xl">
          <p class="rise text-sm font-extrabold tracking-[0.24em] text-brand-mint uppercase" style="--d: 0.05s">
            {{ indir.eyebrow }}
          </p>
          <h1 class="rise mt-5 font-display text-5xl leading-[1.05] font-semibold tracking-[-0.02em] sm:text-6xl" style="--d: 0.12s">
            {{ indir.title }}
          </h1>
          <p class="rise mt-6 max-w-xl text-lg leading-8 font-semibold text-white/80 sm:text-xl" style="--d: 0.2s">
            {{ indir.sub }}
          </p>

          <div class="rise mt-9" style="--d: 0.28s">
            <p class="text-sm font-bold text-white/65">{{ indir.storeLead }}</p>
            <div class="mt-4">
              <StoreBadges size="lg" class="!justify-start" />
            </div>
            <p class="mt-4 text-sm font-semibold text-brand-mint">{{ indir.freeNote }}</p>
          </div>
        </div>

        <!-- Uygulamanın kendisi: mağaza rozetinin yanında ekranın nasıl
             göründüğünü göstermek, indirme kararının yarısıdır. -->
        <div class="rise relative hidden lg:block" style="--d: 0.24s">
          <div
            class="pointer-events-none absolute top-1/2 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/10 motion-safe:animate-[spin_90s_linear_infinite]"
            aria-hidden="true"
          />
          <div class="animate-float">
            <div class="rotate-[1.5deg] transition-transform duration-500 hover:rotate-0">
              <PhoneMock />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-canvas px-5 py-24 sm:py-28">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-3xl">
          <p class="text-sm font-extrabold tracking-[0.22em] text-brand uppercase">{{ indir.adimlarEyebrow }}</p>
          <h2 class="mt-4 font-display text-4xl leading-tight font-semibold tracking-[-0.015em] text-brand-ink sm:text-5xl">
            {{ indir.adimlarTitle }}
          </h2>
        </div>

        <div class="mt-14 grid gap-5 lg:grid-cols-3">
          <article
            v-for="adim in indir.adimlar"
            :key="adim.key"
            class="group relative overflow-hidden rounded-[2rem] border border-line bg-surface p-7 shadow-[0_14px_40px_rgb(50_47_42/0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-8"
          >
            <div class="absolute top-0 right-0 h-28 w-28 rounded-bl-full bg-brand-mint/15 transition group-hover:bg-brand-mint/25" aria-hidden="true" />
            <p class="relative font-black tracking-[0.18em] text-brand">{{ adim.number }}</p>
            <h3 class="relative mt-16 font-display text-2xl font-semibold tracking-tight text-brand-ink">{{ adim.title }}</h3>
            <p class="relative mt-4 leading-7 font-semibold text-soft">{{ adim.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Zaten indirmiş ziyaretçi için yol. -->
    <section class="px-5 pb-24 sm:pb-28">
      <div class="mx-auto max-w-4xl rounded-[2.5rem] border border-line bg-surface p-8 text-center shadow-lift sm:p-12">
        <h2 class="font-display text-3xl font-semibold tracking-[-0.015em] text-brand-ink">{{ indir.yardimTitle }}</h2>
        <p class="mx-auto mt-4 max-w-xl leading-7 font-semibold text-soft">{{ indir.yardimBody }}</p>
        <div class="mt-7 flex flex-wrap justify-center gap-3">
          <NuxtLink :to="indir.yardimTo" class="btn-primary">{{ indir.yardimCta }}</NuxtLink>
          <NuxtLink :to="indir.surumTo" class="btn-ghost">{{ indir.surumCta }}</NuxtLink>
        </div>
      </div>
    </section>

    <section class="bg-canvas px-5 py-24 sm:py-28">
      <div class="mx-auto max-w-4xl">
        <div class="text-center">
          <p class="text-sm font-extrabold tracking-[0.22em] text-brand uppercase">{{ indir.faqEyebrow }}</p>
          <h2 class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-brand-ink sm:text-5xl">{{ indir.faqTitle }}</h2>
        </div>

        <div class="mt-12 divide-y divide-line overflow-hidden rounded-[2rem] border border-line bg-surface px-6 sm:px-9">
          <details v-for="item in indir.faq" :key="item.q" class="group py-6">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-black text-brand-ink">
              {{ item.q }}
              <span class="relative h-6 w-6 shrink-0 rounded-full bg-brand-mint/40" aria-hidden="true">
                <span class="absolute top-1/2 left-1/2 h-0.5 w-3 -translate-1/2 rounded-full bg-brand-deep" />
                <span class="absolute top-1/2 left-1/2 h-3 w-0.5 -translate-1/2 rounded-full bg-brand-deep transition group-open:rotate-90 group-open:opacity-0" />
              </span>
            </summary>
            <p class="max-w-2xl pt-4 pr-10 leading-7 font-semibold text-soft">{{ item.a }}</p>
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-deep underline underline-offset-4 hover:text-brand"
            >
              Ayrıntılı anlatım
            </NuxtLink>
          </details>
        </div>
      </div>
    </section>

    <!-- Afi'ye sor: SSS'in kardeşi, ana sayfadaki panelin birebir aynısı. -->
    <AskAfiSection attached />
  </div>
</template>
