<script setup lang="ts">
import { authOrtak, epostaDogrula } from '~/data/content'
import { STACK_PROJECT_IDS, stackAuthPost } from '~/utils/stackAuth'

/**
 * E-posta doğrulama inişi: Stack Auth'un e-postayla gönderdiği bağlantı
 * buraya gelir (/e-posta-dogrula/{env}?code=...). Kod, sayfa açılır açılmaz
 * verify ucuna iletilir; kullanıcıdan ek bir şey istenmez.
 * Bilinçli olarak panel dışıdır (usePageSeo yok): bu sayfa her koşulda
 * noindex kalmalı, sitemap'e girmemeli.
 */
useSeoMeta({
  title: 'E-posta doğrulama | afiet',
  robots: 'noindex, nofollow',
})

type State = 'checking' | 'invalid' | 'expired' | 'done'

const route = useRoute()
const projectId = STACK_PROJECT_IDS[String(route.params.env ?? '')] ?? ''

// Ortam segmenti yol parametresidir; geçersizse durum daha SSR'da bellidir.
// ?code= ise yalnızca istemcide okunur (onMounted): doğrulama kodu tek
// kullanımlıktır, SSR/cache katmanında asla tüketilmemeli.
const state = ref<State>(projectId ? 'checking' : 'invalid')

onMounted(async () => {
  if (state.value !== 'checking') return
  const raw = Array.isArray(route.query.code) ? route.query.code[0] : route.query.code
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    state.value = 'invalid'
    return
  }
  const res = await stackAuthPost(projectId, '/contact-channels/verify', { code: value })
  state.value = res.ok ? 'done' : 'expired'
})
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center px-5 py-14 sm:py-20">
    <section class="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 text-center shadow-lift sm:p-9">
      <AfiMascot class="mx-auto h-14 w-14" />
      <p class="mt-3 text-2xl font-extrabold tracking-tight text-brand">afiet</p>

      <!-- KONTROL: kod Stack Auth'a iletiliyor -->
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
        <h1 class="text-xl font-extrabold tracking-tight text-ink">{{ epostaDogrula.expiredTitle }}</h1>
        <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ epostaDogrula.expiredBody }}</p>
      </div>

      <!-- BAŞARI: kısa kutlama, kullanıcı uygulamaya kendisi döner -->
      <div v-else class="mt-6" role="status">
        <h1 class="text-xl font-extrabold tracking-tight text-brand-deep">
          {{ epostaDogrula.doneTitle }}
        </h1>
        <p class="mt-2 rounded-2xl bg-brand-mint/30 p-4 text-[15px] leading-relaxed font-semibold text-brand-ink">
          {{ epostaDogrula.doneBody }}
        </p>
      </div>
    </section>
  </div>
</template>
