<script setup lang="ts">
/** Bugün ekranının stilize hali — görsel yalnızca temsilidir, canlı UI değildir. */
const groups = [
  { label: 'Sebze', dot: 'bg-sebze', done: true },
  { label: 'Meyve', dot: 'bg-meyve', done: false },
  { label: 'Protein', dot: 'bg-protein', done: true },
  { label: 'Tahıl', dot: 'bg-tahil', done: true },
  { label: 'Süt', dot: 'bg-sut', done: false },
]
</script>

<template>
  <div
    class="relative mx-auto w-[19rem] rounded-[3.2rem] bg-[#2b2823] p-[10px] shadow-float sm:w-[20.5rem]"
    aria-hidden="true"
  >
    <div class="relative overflow-hidden rounded-[2.6rem] bg-canvas">
      <!-- çentik -->
      <div class="absolute top-2.5 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-[#2b2823]" />

      <div class="space-y-3 px-4 pt-11 pb-5">
        <!-- BrandHeader + aile avatarları -->
        <div class="flex items-end justify-between">
          <div class="flex items-center gap-2">
            <AfiMascot class="h-8 w-8" />
            <div class="leading-none">
              <div class="text-lg font-extrabold tracking-tight text-brand">afiet</div>
              <div class="mt-0.5 text-[9px] font-bold text-muted">Sayma, dengele.</div>
            </div>
          </div>
          <div class="flex -space-x-1.5">
            <span
              v-for="(a, i) in ['😀', '🐥', '🦊']"
              :key="a"
              class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-canvas bg-surface text-[13px] shadow-sm"
              :class="i === 0 ? 'ring-2 ring-brand-bright' : ''"
            >
              {{ a }}
            </span>
          </div>
        </div>

        <!-- kutlama balonu -->
        <div
          class="absolute top-24 right-3 rotate-3 animate-float rounded-full bg-brand px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lift"
        >
          Afiyet olsun! 🎉
        </div>

        <!-- denge kartı -->
        <div class="rounded-3xl border border-line/70 bg-surface p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-extrabold">Bugünün dengesi</span>
            <span class="rounded-full bg-brand-mint/60 px-2 py-0.5 text-[9px] font-extrabold text-brand-deep">
              3/5 grup
            </span>
          </div>
          <div class="mt-2.5 flex flex-wrap gap-1.5">
            <span
              v-for="g in groups"
              :key="g.label"
              class="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold"
              :class="g.done ? 'bg-canvas text-ink' : 'bg-canvas/60 text-muted'"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="[g.dot, g.done ? '' : 'opacity-40']" />
              {{ g.label }}
              <span v-if="g.done" class="text-brand-deep">✓</span>
            </span>
          </div>
          <p class="mt-2 text-[9.5px] font-bold text-soft">Bugün meyveye yer açılır mı? 🍓</p>
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

        <!-- öğün kartı -->
        <div class="flex items-center justify-between rounded-3xl border border-line/70 bg-surface p-3.5">
          <div>
            <div class="flex items-center gap-1.5 text-[11px] font-extrabold">
              <span class="h-1.5 w-1.5 rounded-full bg-protein" />
              Kahvaltı
            </div>
            <p class="mt-1 text-[9.5px] font-bold text-soft">menemen · 1 dilim köy ekmeği</p>
          </div>
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white"
          >
            +
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
