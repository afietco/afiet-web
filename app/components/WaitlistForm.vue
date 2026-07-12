<script setup lang="ts">
import { cta } from '~/data/content'

/**
 * Bekleme listesi. Endpoint (NUXT_PUBLIC_WAITLIST_ENDPOINT) tanımlı değilken
 * form yerine "çok yakında" satırı gösterilir — çalışmayan form yayınlamayız.
 */
const endpoint = useRuntimeConfig().public.waitlistEndpoint
const email = ref('')
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle')

async function submit() {
  if (!endpoint || state.value === 'sending') return
  state.value = 'sending'
  try {
    await $fetch(endpoint, {
      method: 'POST',
      body: { email: email.value, source: 'landing' },
    })
    state.value = 'done'
  } catch {
    state.value = 'error'
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <p
      v-if="state === 'done'"
      class="rounded-full bg-brand-mint/50 px-6 py-3.5 font-extrabold text-brand-deep"
      role="status"
    >
      {{ cta.formDone }}
    </p>

    <form v-else-if="endpoint" class="flex flex-col gap-3 sm:flex-row" @submit.prevent="submit">
      <label class="sr-only" for="waitlist-email">E-posta adresin</label>
      <input
        id="waitlist-email"
        v-model="email"
        type="email"
        name="email"
        required
        autocomplete="email"
        :placeholder="cta.formPlaceholder"
        class="min-w-0 flex-1 rounded-full border border-line bg-canvas px-5 py-3.5 font-semibold text-ink placeholder:text-muted focus:border-brand"
      />
      <button type="submit" class="btn-primary shrink-0" :disabled="state === 'sending'">
        {{ state === 'sending' ? 'Gönderiliyor…' : cta.formButton }}
      </button>
    </form>

    <p v-else class="font-extrabold text-brand-deep">{{ cta.formSoon }}</p>

    <p v-if="state === 'error'" class="mt-3 text-sm font-bold text-meyve" role="alert">
      {{ cta.formError }}
    </p>
  </div>
</template>
