<script setup lang="ts">
import { support } from '~/data/content'

/**
 * "Bu yazı yardımcı oldu mu?" Tek amacı hangi yazının işini görmediğini
 * görmek; kişisel veri toplamaz, serbest metin istemez.
 *
 * Oy birinci-taraf analitiğe gider ve sayfa görüntülemeyle AYNI KVKK onayı
 * kapısından geçer ($afietEvent; onay yoksa hiçbir şey gönderilmez). Verilen
 * oy tarayıcıda hatırlanır: aynı ziyaretçi aynı yazıya defalarca oy verip
 * sayıyı bozmasın ve kendini tekrarlayan bir soruyla karşılaşmasın.
 */
const props = defineProps<{ path: string }>()

const { $afietEvent } = useNuxtApp()
const vote = ref<'evet' | 'hayir' | ''>('')

const storageKey = computed(() => `afiet_destek_oy:${props.path}`)

onMounted(() => {
  try {
    const saved = localStorage.getItem(storageKey.value)
    if (saved === 'evet' || saved === 'hayir') vote.value = saved
  } catch {
    /* depolama kapalıysa soru yine sorulur, sorun değil */
  }
})

function cast(value: 'evet' | 'hayir') {
  if (vote.value) return
  vote.value = value
  try {
    localStorage.setItem(storageKey.value, value)
  } catch {
    /* yut */
  }
  $afietEvent('destek_oy', { p: props.path, v: value })
}
</script>

<template>
  <div class="rounded-3xl border border-line bg-surface px-6 py-5">
    <div v-if="!vote" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="font-extrabold tracking-tight text-ink">{{ support.voteQuestion }}</p>
      <div class="flex gap-2">
        <button type="button" class="btn-ghost !px-4 !py-2 text-sm" @click="cast('evet')">
          {{ support.voteYes }}
        </button>
        <button type="button" class="btn-ghost !px-4 !py-2 text-sm" @click="cast('hayir')">
          {{ support.voteNo }}
        </button>
      </div>
    </div>
    <p v-else class="font-bold text-brand-deep" role="status">
      {{ vote === 'evet' ? support.voteThanksYes : support.voteThanksNo }}
    </p>
  </div>
</template>
