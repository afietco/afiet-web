<script setup lang="ts">
/**
 * Bugün ekranının stilize hali - görsel yalnızca temsilidir, canlı UI değildir.
 *
 * Uygulamanın güncel hiyerarşisine sadıktır (afiet-mobile Bugün ekranı):
 * zümrüt "Beslenme" hero kartı (4 makro halkası + haftalık afiyet ritmi),
 * altında Afi'nin günün notu, altında Su kartı. Kese rozeti bilinçli olarak
 * YOK (özellik bayrağı kapalı, mağazada henüz yaşamıyor).
 *
 * Halkalar hero kartta TEK TON BEYAZDIR; makro renk kimliği uygulamada
 * Beslenme detayında yaşar (MacroRings.tsx'teki kararın aynısı).
 */

/* Halka geometrisi MacroRings ile aynı: r=15.5, çevre 2πr. */
const R = 15.5
const C = 2 * Math.PI * R
const arc = (pct: number) => `${(Math.min(100, pct) / 100) * C} ${C}`

const rings: { label: string; pct: number; icon: 'enerji' | 'protein' | 'karb' | 'yag' }[] = [
  { label: 'Enerji', pct: 72, icon: 'enerji' },
  { label: 'Protein', pct: 58, icon: 'protein' },
  { label: 'Karb.', pct: 46, icon: 'karb' },
  { label: 'Yağ', pct: 34, icon: 'yag' },
]

/* Afiyet ritmi: Pzt→Paz, dolu nokta = afiyet günü. Kayıp dili yok; boş nokta
   "kaçırılmış gün" değil, sadece dolmamış nokta. Bugün = Salı (index 1). */
const week = [
  { day: 'Pt', done: true },
  { day: 'Sa', done: true, today: true },
  { day: 'Ça', done: false },
  { day: 'Pe', done: false },
  { day: 'Cu', done: false },
  { day: 'Ct', done: false },
  { day: 'Pz', done: false },
]
</script>

<template>
  <div
    class="relative mx-auto w-[19rem] rounded-[3.2rem] bg-[#2b2823] p-[10px] shadow-float sm:w-[20.5rem]"
    aria-hidden="true"
  >
    <div class="relative overflow-hidden rounded-[2.6rem] bg-canvas">
      <!-- çentik -->
      <div class="absolute top-2.5 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#2b2823]" />

      <div class="space-y-2.5 px-4 pt-11 pb-5">
        <!-- BrandHeader: Bugün'ün kalıcı parçası (BRAND.md wordmark referansı) -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AfiMascot class="h-8 w-8" />
            <div class="leading-none">
              <div class="text-lg font-extrabold tracking-tight text-brand">afiet</div>
              <div class="mt-0.5 text-[9px] font-bold text-muted">Sayma, dengele.</div>
            </div>
          </div>
          <!-- bildirim zili -->
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-soft"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
        </div>

        <!-- selamlama satırı (TodayHeader) -->
        <div class="flex items-center gap-1.5 pt-0.5 text-[9.5px] font-bold text-soft">
          <svg class="h-3 w-3 text-tahil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          Merhaba · Salı, 5 Ağustos
        </div>

        <!-- kutlama balonu -->
        <div
          class="absolute top-[7.2rem] right-3 z-10 rotate-3 animate-float rounded-full bg-brand px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lift"
        >
          Afiyet olsun! 🎉
        </div>

        <!-- Beslenme hero kartı: zümrüt degrade, uygulamadaki NutritionCard -->
        <div
          class="relative overflow-hidden rounded-3xl p-3.5"
          style="background-image: linear-gradient(135deg, #064e3b, #065f46 55%, #115e59)"
        >
          <div class="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-black/10" />

          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
                <!-- kase -->
                <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M4 11h16a8 8 0 0 1-16 0Z" />
                  <path d="M9 7c0-1.5 1-2 1-3M14 7c0-1.5 1-2 1-3" />
                </svg>
              </span>
              <span class="text-[11px] font-extrabold text-white">Beslenme</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-extrabold text-white">
                Denge pusulan
              </span>
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-extrabold text-brand">
                +
              </span>
            </div>
          </div>

          <!-- makro halkaları: hero'da tek ton beyaz -->
          <div class="relative mt-2.5 flex items-start justify-between px-1">
            <div v-for="ring in rings" :key="ring.label" class="flex flex-col items-center gap-1">
              <span class="relative block h-10 w-10">
                <svg class="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" :r="R" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2.6" />
                  <circle
                    cx="18"
                    cy="18"
                    :r="R"
                    fill="none"
                    stroke="#fff"
                    stroke-width="2.6"
                    stroke-linecap="round"
                    :stroke-dasharray="arc(ring.pct)"
                  />
                </svg>
                <svg
                  class="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <!-- alev -->
                  <path v-if="ring.icon === 'enerji'" d="M12 3c1 3-3 4.5-3 8a3.5 3.5 0 0 0 7 0c0-1.2-.5-2.2-1-3-.3 1-.8 1.5-1.5 2C13 8 14 5.5 12 3Z" />
                  <!-- yumurta -->
                  <path v-else-if="ring.icon === 'protein'" d="M12 4c3 0 5.5 4.5 5.5 8.5a5.5 5.5 0 0 1-11 0C6.5 8.5 9 4 12 4Z" />
                  <!-- başak -->
                  <path v-else-if="ring.icon === 'karb'" d="M12 21V7M12 7c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4Zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4Zm0 5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4Zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4Z" />
                  <!-- zeytin -->
                  <g v-else>
                    <ellipse cx="12" cy="14" rx="5" ry="6" />
                    <path d="M12 8c0-2 1.5-3.5 4-4" />
                  </g>
                </svg>
              </span>
              <span class="text-[7.5px] font-extrabold text-white/85">{{ ring.label }}</span>
            </div>
          </div>

          <!-- afiyet ritmi şeridi -->
          <div class="relative mt-2.5 border-t border-white/15 pt-2">
            <div class="flex items-center justify-between">
              <div class="flex items-end gap-2">
                <div v-for="d in week" :key="d.day" class="flex flex-col items-center gap-1">
                  <span
                    class="block h-2.5 w-2.5 rounded-full"
                    :class="[
                      d.done ? 'bg-white' : 'border-[1.5px] border-white/60',
                      d.today ? 'ring-2 ring-white/30' : '',
                    ]"
                  />
                  <span class="text-[6.5px] font-bold text-white/70">{{ d.day }}</span>
                </div>
              </div>
              <span class="text-[8px] font-extrabold text-white/90">2 afiyet günü</span>
            </div>
          </div>
        </div>

        <!-- Afi'nin günün notu -->
        <div class="flex items-center gap-2 rounded-2xl border border-line/70 bg-surface py-2 pr-3 pl-2">
          <span class="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <span class="absolute inset-0 rounded-full bg-brand-mint/50 blur-[6px]" />
            <AfiMascot class="relative h-8 w-8" />
          </span>
          <p class="text-[9.5px] leading-snug font-bold text-soft">
            Bugün meyveye yer açılır mı? 🍓
          </p>
        </div>

        <!-- su kartı -->
        <div class="rounded-3xl border border-line/70 bg-surface p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-extrabold">Su</span>
            <span class="text-[9px] font-extrabold text-sut">5/8 bardak</span>
          </div>
          <div class="mt-2 flex gap-1.5">
            <span
              v-for="i in 8"
              :key="i"
              class="h-4 w-3 rounded-[4px] rounded-t-[2px]"
              :class="i <= 5 ? 'bg-sut/80' : 'border border-line bg-canvas'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
