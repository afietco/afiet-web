<script setup lang="ts">
import { bulten } from '~/data/content'
import { bultenEn } from '~/data/content.en'

/**
 * Bülten kayıt formu; footer bandı, blog yazı sonu, /iletisim, /en ana sayfa
 * ve /en/contact'ta yaşar; nereden geldiği `source` ile işaretlenir. Çift
 * onay: buradan yalnız "beklemede" kayıt düşer, abonelik onay mailindeki
 * bağlantıyla başlar. Honeypot beta formuyla aynı sözleşmedir (`company`).
 *
 * `lang` kaydın diliyle birlikte sunucuya gider: onay maili o dilde atılır
 * ve abone listede lang='en' işaretiyle durur (İngilizce duyurular yalnız o
 * kesime gönderilir). Varsayılan 'tr' - mevcut çağrılar değişmeden çalışır.
 */
const props = withDefaults(defineProps<{ source: string; lang?: 'tr' | 'en' }>(), {
  lang: 'tr',
})

const route = useRoute()
const { $afietEvent } = useNuxtApp()

const copy = computed(() => (props.lang === 'en' ? bultenEn : bulten))
const privacyTo = computed(() => (props.lang === 'en' ? '/en/privacy' : '/gizlilik'))
const privacyLabel = computed(() => (props.lang === 'en' ? bultenEn.privacyLabel : 'Gizlilik'))

const email = ref('')
const company = ref('') // honeypot: insanlar görmez, botlar doldurur
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle')
const note = ref('')

/* Beta formuyla aynı gevşeklikte: adres biçimini sunucu da ayrıca doğrular. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function submit() {
  const value = email.value.trim().toLowerCase()
  if (!EMAIL_RE.test(value)) {
    note.value = copy.value.invalid
    return
  }
  note.value = ''
  state.value = 'sending'
  try {
    await $fetch('/api/bulten/abone', {
      method: 'POST',
      body: { email: value, source: props.source, lang: props.lang, company: company.value },
    })
    state.value = 'done'
    // Web dönüşümü: yalnız "hangi sayfadan, hangi formdan" bilgisi; e-posta
    // analitik tablosuna girmez. Onay yoksa plugin sessizce yutar.
    $afietEvent('bulten_kayit', { p: route.path, v: props.source })
  } catch {
    state.value = 'error'
    note.value = copy.value.error
  }
}
</script>

<template>
  <div>
    <p
      v-if="state === 'done'"
      class="rounded-3xl border border-brand/25 bg-brand-mint/25 px-5 py-4 font-bold text-brand-deep"
      role="status"
    >
      {{ copy.success }}
    </p>

    <form v-else novalidate @submit.prevent="submit">
      <div
        class="flex items-center gap-1.5 rounded-full border border-line bg-surface p-1.5 shadow-lift transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15"
      >
        <label class="sr-only" :for="`bulten-eposta-${source}`">{{ copy.placeholder }}</label>
        <input
          :id="`bulten-eposta-${source}`"
          v-model="email"
          type="email"
          autocomplete="email"
          :placeholder="copy.placeholder"
          class="w-full min-w-0 flex-1 bg-transparent px-3.5 py-1.5 font-semibold text-ink placeholder:text-muted focus:outline-none"
        />
        <!-- honeypot: görünmez alan, doluysa sunucu kaydı sessizce yok sayar -->
        <input
          v-model="company"
          type="text"
          name="company"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
          class="absolute h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          class="btn-primary shrink-0 !px-5 !py-2.5 text-sm"
          :disabled="state === 'sending'"
        >
          {{ state === 'sending' ? copy.sending : copy.submit }}
        </button>
      </div>
      <p v-if="note" class="mt-2 px-2 text-sm font-bold text-protein" role="alert">{{ note }}</p>
      <p class="mt-2 px-2 text-xs font-semibold text-muted">
        {{ copy.kvkk }}
        <NuxtLink :to="privacyTo" class="underline decoration-line underline-offset-2 transition hover:text-brand-deep">
          {{ privacyLabel }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
