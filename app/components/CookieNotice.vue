<script setup lang="ts">
/**
 * KVKK çerez bilgilendirmesi. Yalnız analitik toplanabilecek host'ta ve henüz
 * seçim yapılmadıysa görünür. "Kabul et" → analitik plugin'i (opt-in) devreye
 * girer ve geçerli sayfayı sayar; "Reddet" → hiçbir şey toplanmaz.
 */
import { onMounted, ref } from 'vue'

const KEY = 'afiet_analytics_consent'
const visible = ref(false)

const domains = String(useRuntimeConfig().public.analyticsDomains || '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean)

onMounted(() => {
  try {
    if (!domains.includes(location.hostname)) return
    if (navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1') return
    if (localStorage.getItem(KEY)) return
    visible.value = true
  } catch {
    /* localStorage engelli olabilir */
  }
})

function decide(choice: 'accepted' | 'declined') {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    /* yut */
  }
  visible.value = false
  if (choice === 'accepted') window.dispatchEvent(new CustomEvent('afiet:analytics-consent'))
}
</script>

<template>
  <Transition name="cookie">
    <div
      v-if="visible"
      class="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-lift sm:flex-row sm:items-center sm:justify-between sm:gap-5"
      role="dialog"
      aria-label="Çerez bilgilendirmesi"
    >
      <p class="text-[13px] leading-relaxed text-soft">
        afiet.co'yu geliştirmek için ziyaretleri <strong class="font-bold text-ink">anonim ve toplu</strong> ölçüyoruz
        (kendi sunucumuzda, birinci-taraf çerez; IP saklanmaz, üçüncü tarafla paylaşılmaz).
        <NuxtLink to="/gizlilik" class="font-bold text-brand underline-offset-2 hover:underline">Ayrıntılar</NuxtLink>
      </p>
      <div class="flex shrink-0 gap-2">
        <button
          type="button"
          class="rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:border-brand/40 hover:text-brand-deep active:scale-[0.97]"
          @click="decide('declined')"
        >
          Reddet
        </button>
        <button
          type="button"
          class="rounded-full bg-brand px-4 py-2 text-sm font-extrabold text-white shadow-lift transition hover:bg-brand-deep active:scale-[0.97]"
          @click="decide('accepted')"
        >
          Kabul et
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-enter-active,
.cookie-leave-active {
  transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.cookie-enter-from,
.cookie-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
@media (prefers-reduced-motion: reduce) {
  .cookie-enter-active,
  .cookie-leave-active {
    transition: opacity 0.2s ease;
  }
  .cookie-enter-from,
  .cookie-leave-to {
    transform: none;
  }
}
</style>
