<script setup lang="ts">
import { destek } from '~/data/content'

/**
 * "Bu yazı yardımcı oldu mu?" Tek amacı hangi yazının işini görmediğini
 * görmek; kişisel veri toplamaz, serbest metin istemez.
 *
 * Oy birinci-taraf analitiğe gider ve sayfa görüntülemeyle AYNI KVKK onayı
 * kapısından geçer ($afietOlay; onay yoksa hiçbir şey gönderilmez). Verilen
 * oy tarayıcıda hatırlanır: aynı ziyaretçi aynı yazıya defalarca oy verip
 * sayıyı bozmasın ve kendini tekrarlayan bir soruyla karşılaşmasın.
 */
const props = defineProps<{ yol: string }>()

const { $afietOlay } = useNuxtApp()
const verilen = ref<'evet' | 'hayir' | ''>('')

const anahtar = computed(() => `afiet_destek_oy:${props.yol}`)

onMounted(() => {
  try {
    const kayitli = localStorage.getItem(anahtar.value)
    if (kayitli === 'evet' || kayitli === 'hayir') verilen.value = kayitli
  } catch {
    /* depolama kapalıysa soru yine sorulur, sorun değil */
  }
})

function oyVer(deger: 'evet' | 'hayir') {
  if (verilen.value) return
  verilen.value = deger
  try {
    localStorage.setItem(anahtar.value, deger)
  } catch {
    /* yut */
  }
  $afietOlay('destek_oy', { p: props.yol, v: deger })
}
</script>

<template>
  <div class="rounded-3xl border border-line bg-surface px-6 py-5">
    <div v-if="!verilen" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="font-extrabold tracking-tight text-ink">{{ destek.voteQuestion }}</p>
      <div class="flex gap-2">
        <button type="button" class="btn-ghost !px-4 !py-2 text-sm" @click="oyVer('evet')">
          {{ destek.voteYes }}
        </button>
        <button type="button" class="btn-ghost !px-4 !py-2 text-sm" @click="oyVer('hayir')">
          {{ destek.voteNo }}
        </button>
      </div>
    </div>
    <p v-else class="font-bold text-brand-deep" role="status">
      {{ verilen === 'evet' ? destek.voteThanksYes : destek.voteThanksNo }}
    </p>
  </div>
</template>
