<script setup lang="ts">
import { authOrtak, sifreYenile } from '~/data/content'
import { STACK_PROJECT_IDS, stackAuthPost } from '~/utils/stackAuth'

/**
 * Şifre sıfırlama inişi: Stack Auth'un e-postayla gönderdiği bağlantı
 * buraya gelir (/sifre-yenile/{env}?code=...). Kod önce check-code ile
 * doğrulanır, geçerliyse tek alanlık yeni şifre formu gösterilir.
 * Bilinçli olarak panel dışıdır (usePageSeo yok): bu sayfa her koşulda
 * noindex kalmalı, sitemap'e girmemeli.
 */
useSeoMeta({
  title: 'Şifreni yenile | afiet',
  robots: 'noindex, nofollow',
})

type State = 'checking' | 'invalid' | 'expired' | 'form' | 'done'

const route = useRoute()
const projectId = STACK_PROJECT_IDS[String(route.params.env ?? '')] ?? ''

// Ortam segmenti yol parametresidir; geçersizse durum daha SSR'da bellidir.
// ?code= ise yalnızca istemcide okunur (onMounted): sayfa kabuğu cache'lense
// bile davranış değişmesin.
const state = ref<State>(projectId ? 'checking' : 'invalid')
const code = ref('')
const password = ref('')
const sending = ref(false)
const formError = ref('')

onMounted(async () => {
  if (state.value !== 'checking') return
  const raw = Array.isArray(route.query.code) ? route.query.code[0] : route.query.code
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    state.value = 'invalid'
    return
  }
  code.value = value
  const res = await stackAuthPost(projectId, '/auth/password/reset/check-code', { code: value })
  state.value = res.ok && res.data.is_code_valid === true ? 'form' : 'expired'
})

async function submit() {
  if (sending.value) return
  formError.value = ''
  if (password.value.length < 8) {
    formError.value = sifreYenile.errTooShort
    return
  }
  sending.value = true
  const res = await stackAuthPost(projectId, '/auth/password/reset', {
    code: code.value,
    password: password.value,
  })
  sending.value = false
  if (res.ok) {
    state.value = 'done'
    return
  }
  if (res.code === 'PASSWORD_TOO_SHORT') formError.value = sifreYenile.errTooShort
  else if (res.code.startsWith('VERIFICATION_CODE')) state.value = 'expired'
  else formError.value = sifreYenile.errGeneric
}
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center px-5 py-14 sm:py-20">
    <section class="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 text-center shadow-lift sm:p-9">
      <AfiMascot class="mx-auto h-14 w-14" />
      <p class="mt-3 text-2xl font-extrabold tracking-tight text-brand">afiet</p>

      <!-- KONTROL: kod Stack Auth'ta doğrulanıyor -->
      <div v-if="state === 'checking'" class="mt-6" role="status">
        <span
          class="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand"
          aria-hidden="true"
        />
        <p class="mt-3 font-semibold text-soft">{{ authOrtak.checking }}</p>
      </div>

      <!-- GEÇERSİZ: ortam segmenti tanınmıyor ya da ?code= yok -->
      <div v-else-if="state === 'invalid'" class="mt-6">
        <h1 class="text-xl font-extrabold tracking-tight text-ink">{{ authOrtak.invalidTitle }}</h1>
        <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ authOrtak.invalidBody }}</p>
      </div>

      <!-- SÜRESİ DOLMUŞ / KULLANILMIŞ -->
      <div v-else-if="state === 'expired'" class="mt-6">
        <h1 class="text-xl font-extrabold tracking-tight text-ink">{{ sifreYenile.expiredTitle }}</h1>
        <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ sifreYenile.expiredBody }}</p>
      </div>

      <!-- FORM: kod geçerli, yeni şifre alınıyor -->
      <form v-else-if="state === 'form'" class="mt-6 text-left" novalidate @submit.prevent="submit">
        <h1 class="text-center text-xl font-extrabold tracking-tight text-ink">
          {{ sifreYenile.title }}
        </h1>
        <label class="mt-5 block text-sm font-bold text-ink" for="yeni-sifre">
          {{ sifreYenile.label }}
        </label>
        <input
          id="yeni-sifre"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          :aria-invalid="Boolean(formError)"
          aria-describedby="sifre-ipucu"
          class="mt-2 w-full rounded-full border bg-canvas px-5 py-3.5 font-semibold text-ink transition focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          :class="formError ? 'border-meyve ring-4 ring-meyve/10' : 'border-line'"
          @input="formError = ''"
        />
        <p
          id="sifre-ipucu"
          class="mt-2 min-h-5 text-sm font-semibold"
          :class="formError ? 'text-meyve' : 'text-muted'"
          aria-live="polite"
        >
          {{ formError || sifreYenile.hint }}
        </p>
        <button type="submit" class="btn-primary mt-4 w-full" :disabled="sending">
          <span
            v-if="sending"
            class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          {{ sending ? sifreYenile.sending : sifreYenile.button }}
        </button>
      </form>

      <!-- BAŞARI: kullanıcı uygulamaya kendisi döner, buton/link yok -->
      <div v-else class="mt-6" role="status">
        <h1 class="text-xl font-extrabold tracking-tight text-brand-deep">
          {{ sifreYenile.doneTitle }}
        </h1>
        <p class="mt-2 rounded-2xl bg-brand-mint/30 p-4 text-[15px] leading-relaxed font-semibold text-brand-ink">
          {{ sifreYenile.doneBody }}
        </p>
      </div>
    </section>
  </div>
</template>
