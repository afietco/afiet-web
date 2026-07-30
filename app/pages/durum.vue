<script setup lang="ts">
import {
  components,
  incidents,
  overall,
  providers,
  STATE_LABEL,
  type ServiceState,
} from '~/data/status'

// Meta/canonical panelden yönetilir (varsayılanlar seoDefaults.ts'te).
usePageSeo()

/** Durum noktası ve rozet renkleri; 'none' gri kalır (henüz veri yok). */
const dotClasses: Record<ServiceState, string> = {
  up: 'bg-brand-bright',
  degraded: 'bg-tahil',
  down: 'bg-meyve',
  none: 'bg-line',
}

const pillClasses: Record<ServiceState, string> = {
  up: 'bg-brand-mint/40 text-brand-deep',
  degraded: 'bg-tahil/15 text-tahil',
  down: 'bg-meyve/10 text-meyve',
  none: 'bg-line/60 text-muted',
}

const barClasses: Record<ServiceState, string> = {
  up: 'bg-brand-bright/80',
  degraded: 'bg-tahil',
  down: 'bg-meyve',
  none: 'bg-line',
}

/* Tailwind sınıfları kaynakta düz metin olmalı; HeroSection'daki eşlemenin aynısı. */
const accentDot: Record<(typeof components)[number]['accent'], string> = {
  sebze: 'bg-sebze',
  meyve: 'bg-meyve',
  protein: 'bg-protein',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
}

const heroTitle: Record<ServiceState, { a: string; b: string }> = {
  up: { a: 'Her şey', b: 'yolunda.' },
  degraded: { a: 'Küçük bir', b: 'aksama var.' },
  down: { a: 'Bir kesinti', b: 'yaşıyoruz.' },
  none: { a: 'Duruma', b: 'bakıyoruz.' },
}

const bannerText: Record<ServiceState, string> = {
  up: 'Tüm sistemler çalışıyor',
  degraded: 'Bazı servislerde yavaşlama var',
  down: 'Bazı servislerde kesinti var',
  none: 'Durum verisi toplanıyor',
}

const title = heroTitle[overall.state]

/** Bar başlığı: "29 Temmuz · Kesinti (29 dk)" gibi. */
function dayTitle(date: string, state: ServiceState, note?: string) {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  })
  return note ? `${label} · ${note}` : `${label} · ${STATE_LABEL[state]}`
}
</script>

<template>
  <div>
    <!-- sofra ışığı: diğer sayfalarla aynı sıcak lekeler -->
    <section class="relative overflow-hidden" aria-labelledby="durum-baslik">
      <div
        class="pointer-events-none absolute -top-56 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-[#fff3d6]/70 blur-3xl"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -top-40 -left-44 h-[30rem] w-[30rem] rounded-full bg-brand-mint/40 blur-3xl"
        aria-hidden="true"
      />

      <div class="relative mx-auto max-w-4xl px-5 pt-14 pb-10 sm:pt-20">
        <p
          class="rise inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-mint/30 px-4 py-1.5 text-sm font-extrabold text-brand-deep"
        >
          <span class="h-2 w-2 rounded-full bg-brand-bright" aria-hidden="true" />
          sistem durumu
        </p>

        <h1
          id="durum-baslik"
          class="rise mt-5 font-display text-[clamp(2.8rem,7vw,4.6rem)] leading-[1.02] font-semibold tracking-[-0.02em] text-ink"
          style="--d: 80ms"
        >
          {{ title.a }}
          <span class="wonk text-brand italic">{{ title.b }}</span>
        </h1>

        <p class="rise mt-4 max-w-xl text-lg leading-relaxed text-soft" style="--d: 140ms">
          afiet'in servislerini buradan izleyebilirsin. Mobil uygulamada yaşadığın bir aksaklık
          genellikle aşağıdaki bileşenlerden birine bağlıdır.
        </p>

        <!-- genel durum bandı -->
        <div
          class="rise mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-3xl border border-line bg-surface px-6 py-5 shadow-lift"
          style="--d: 200ms"
        >
          <span class="relative flex h-3.5 w-3.5" aria-hidden="true">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              :class="dotClasses[overall.state]"
            />
            <span
              class="relative inline-flex h-3.5 w-3.5 rounded-full"
              :class="dotClasses[overall.state]"
            />
          </span>
          <span class="text-lg font-extrabold tracking-tight text-ink">
            {{ bannerText[overall.state] }}
          </span>
          <span class="text-sm font-bold text-muted">
            Son kontrol: {{ overall.checkedAt }} · {{ overall.intervalNote }}
          </span>
        </div>
      </div>
    </section>

    <!-- bileşenler -->
    <section class="mx-auto max-w-4xl px-5 pb-8" aria-label="Servis bileşenleri">
      <ul class="flex flex-col gap-4">
        <li
          v-for="(c, i) in components"
          :key="c.id"
          v-reveal="i * 60"
          class="reveal rounded-3xl border border-line bg-surface p-5 shadow-lift sm:p-6"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div class="flex items-baseline gap-2.5">
              <span
                class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                :class="accentDot[c.accent]"
                aria-hidden="true"
              />
              <h2 class="text-lg font-extrabold tracking-tight text-ink">{{ c.name }}</h2>
              <span class="text-xs font-bold text-muted">{{ c.provider }}</span>
            </div>
            <span
              class="rounded-full px-3 py-1 text-xs font-extrabold"
              :class="pillClasses[c.state]"
            >
              {{ STATE_LABEL[c.state] }}
            </span>
          </div>

          <!-- 90 günlük şerit: eski günler solda; dar ekranda son 45 gün -->
          <div class="mt-4 flex h-9 items-stretch gap-[2px]" aria-hidden="true">
            <span
              v-for="(d, j) in c.days"
              :key="d.date"
              class="min-w-0 flex-1 rounded-[2px] transition hover:opacity-70"
              :class="[barClasses[d.state], j < 45 ? 'hidden sm:block' : '']"
              :title="dayTitle(d.date, d.state, d.note)"
            />
          </div>
          <div class="mt-2 flex items-center justify-between text-xs font-bold text-muted">
            <span><span class="sm:hidden">45</span><span class="hidden sm:inline">90</span> gün önce</span>
            <span>Çalışma oranı: %{{ c.uptime }}</span>
            <span>bugün</span>
          </div>
        </li>
      </ul>
    </section>

    <!-- sağlayıcılar -->
    <section class="mx-auto max-w-4xl px-5 py-8" aria-labelledby="saglayici-baslik">
      <h2 id="saglayici-baslik" class="text-sm font-extrabold tracking-wide text-brand uppercase">
        Sağlayıcı durumları
      </h2>
      <p class="mt-1.5 text-sm leading-relaxed text-soft">
        afiet'in üzerinde koştuğu altyapılar. Durumları sağlayıcıların kendi sayfalarından
        düzenli olarak okunur.
      </p>
      <ul class="mt-4 grid gap-3 sm:grid-cols-2">
        <li v-for="(p, i) in providers" :key="p.name" v-reveal="i * 60" class="reveal">
          <a
            :href="p.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift"
          >
            <span class="flex items-center gap-3">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                :class="dotClasses[p.state]"
                aria-hidden="true"
              />
              <span class="font-extrabold tracking-tight text-ink">{{ p.name }}</span>
              <span class="text-xs font-bold text-muted">{{ p.note }}</span>
            </span>
            <span
              class="text-xs font-extrabold text-muted transition group-hover:text-brand-deep"
            >
              {{ STATE_LABEL[p.state] }} ↗
            </span>
          </a>
        </li>
      </ul>
    </section>

    <!-- geçmiş olaylar -->
    <section class="mx-auto max-w-4xl px-5 py-8 pb-16" aria-labelledby="olay-baslik">
      <h2 id="olay-baslik" class="text-sm font-extrabold tracking-wide text-brand uppercase">
        Geçmiş olaylar
      </h2>

      <ol class="mt-4 flex flex-col gap-4">
        <li
          v-for="inc in incidents"
          :key="inc.id"
          v-reveal
          class="reveal rounded-3xl border border-line bg-surface p-6 shadow-lift"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 class="text-lg font-extrabold tracking-tight text-ink">{{ inc.title }}</h3>
            <span
              class="rounded-full px-3 py-1 text-xs font-extrabold"
              :class="inc.resolved ? 'bg-brand-mint/40 text-brand-deep' : 'bg-tahil/15 text-tahil'"
            >
              {{ inc.resolved ? 'Çözüldü' : 'İzleniyor' }}
            </span>
          </div>
          <p class="mt-1 text-xs font-bold text-muted">
            {{ inc.date }} · {{ inc.duration }} · Etkilenen: {{ inc.affected.join(', ') }}
          </p>
          <ol class="mt-4 flex flex-col gap-3 border-l-2 border-line pl-4">
            <li v-for="u in inc.updates" :key="u.time" class="text-[15px] leading-relaxed text-soft">
              <span class="font-extrabold text-ink">{{ u.time }}</span>
              <span class="mx-1.5 text-muted" aria-hidden="true">·</span>{{ u.text }}
            </li>
          </ol>
        </li>
      </ol>

      <p class="mt-4 text-sm leading-relaxed text-soft">
        Son 90 günde başka olay kaydedilmedi. Bir sorun mu fark ettin? Bize
        <a
          href="mailto:destek@afiet.co"
          class="font-bold text-brand-deep underline underline-offset-2 hover:text-brand"
        >destek@afiet.co</a>
        adresinden yazabilirsin.
      </p>
    </section>
  </div>
</template>
