<script setup lang="ts">
import { support } from '~/data/content'
import type { SupportHeading } from '#shared/types/support'

/**
 * "Bu sayfada" listesi. Başlık id'lerini SUNUCU üretir (supportStore
 * renderBody); burada yalnız hangisinin okunmakta olduğu izlenir.
 *
 * Kural tek cümle: yapışkan başlığın altından geçmiş SON başlık işaretlidir.
 * IntersectionObserver bunun için yetmiyor, çünkü yalnız eşik geçildiğinde
 * ateşlenir: uzun bir bölümün ortasında ya da sayfanın en üstünde hiçbir
 * başlık kesişmez ve bayat bir madde işaretli kalır.
 */
const props = defineProps<{ headings: SupportHeading[] }>()

/** Yapışkan site başlığının yüksekliği (h-16) + biraz nefes. */
const HEADER_OFFSET = 88

const active = ref('')
let nodes: HTMLElement[] = []
let queued = false

function measure() {
  queued = false
  let found = ''
  for (const el of nodes) {
    if (el.getBoundingClientRect().top - HEADER_OFFSET <= 0) found = el.id
    else break
  }
  active.value = found
}

/** Kaydırma her karede en fazla bir kez ölçülür. */
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(measure)
}

function setup() {
  nodes = props.headings
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => el !== null)
  measure()
}

onMounted(() => {
  void nextTick(setup)
  addEventListener('scroll', schedule, { passive: true })
  addEventListener('resize', schedule)
})
watch(
  () => props.headings,
  () => nextTick(setup),
)
onBeforeUnmount(() => {
  removeEventListener('scroll', schedule)
  removeEventListener('resize', schedule)
})
</script>

<template>
  <nav v-if="props.headings.length" :aria-label="support.tocTitle">
    <p class="mb-3 text-xs font-extrabold tracking-widest text-muted uppercase">
      {{ support.tocTitle }}
    </p>
    <ul class="flex flex-col gap-0.5 border-l border-line">
      <li v-for="h in props.headings" :key="h.id">
        <a
          :href="`#${h.id}`"
          class="-ml-px block border-l-2 py-1.5 text-sm transition"
          :class="[
            h.level === 3 ? 'pl-6' : 'pl-4',
            active === h.id
              ? 'border-brand font-extrabold text-brand-deep'
              : 'border-transparent font-semibold text-soft hover:text-ink',
          ]"
          :aria-current="active === h.id ? 'location' : undefined"
        >
          {{ h.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
