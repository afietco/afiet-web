<script setup lang="ts">
import { destek } from '~/data/content'
import type { DestekBaslik } from '#shared/types/destek'

/**
 * "Bu sayfada" listesi. Başlık id'lerini SUNUCU üretir (destekStore
 * renderGovde); burada yalnız hangisinin okunmakta olduğu izlenir.
 *
 * Kural tek cümle: yapışkan başlığın altından geçmiş SON başlık işaretlidir.
 * IntersectionObserver bunun için yetmiyor, çünkü yalnız eşik geçildiğinde
 * ateşlenir: uzun bir bölümün ortasında ya da sayfanın en üstünde hiçbir
 * başlık kesişmez ve bayat bir madde işaretli kalır.
 */
const props = defineProps<{ basliklar: DestekBaslik[] }>()

/** Yapışkan site başlığının yüksekliği (h-16) + biraz nefes. */
const UST_SERIT = 88

const aktif = ref('')
let dugumler: HTMLElement[] = []
let beklemede = false

function hesapla() {
  beklemede = false
  let bulunan = ''
  for (const el of dugumler) {
    if (el.getBoundingClientRect().top - UST_SERIT <= 0) bulunan = el.id
    else break
  }
  aktif.value = bulunan
}

/** Kaydırma her karede en fazla bir kez ölçülür. */
function planla() {
  if (beklemede) return
  beklemede = true
  requestAnimationFrame(hesapla)
}

function kur() {
  dugumler = props.basliklar
    .map((b) => document.getElementById(b.id))
    .filter((el): el is HTMLElement => el !== null)
  hesapla()
}

onMounted(() => {
  void nextTick(kur)
  addEventListener('scroll', planla, { passive: true })
  addEventListener('resize', planla)
})
watch(
  () => props.basliklar,
  () => nextTick(kur),
)
onBeforeUnmount(() => {
  removeEventListener('scroll', planla)
  removeEventListener('resize', planla)
})
</script>

<template>
  <nav v-if="props.basliklar.length" :aria-label="destek.tocTitle">
    <p class="mb-3 text-xs font-extrabold tracking-widest text-muted uppercase">
      {{ destek.tocTitle }}
    </p>
    <ul class="flex flex-col gap-0.5 border-l border-line">
      <li v-for="b in props.basliklar" :key="b.id">
        <a
          :href="`#${b.id}`"
          class="-ml-px block border-l-2 py-1.5 text-sm transition"
          :class="[
            b.seviye === 3 ? 'pl-6' : 'pl-4',
            aktif === b.id
              ? 'border-brand font-extrabold text-brand-deep'
              : 'border-transparent font-semibold text-soft hover:text-ink',
          ]"
          :aria-current="aktif === b.id ? 'location' : undefined"
        >
          {{ b.metin }}
        </a>
      </li>
    </ul>
  </nav>
</template>
