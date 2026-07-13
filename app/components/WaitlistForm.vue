<script setup lang="ts">
import { cta } from '~/data/content'

/**
 * Bekleme listesi formu. Kendi Nitro server route'una (/api/waitlist) POST eder;
 * o da e-postayı Neon'a yazar. DB bağlı değilken route "soon" döner ve form
 * zarifçe "çok yakında" moduna geçer — çalışmayan form yayınlanmaz.
 */
type State = 'idle' | 'sending' | 'done' | 'exists' | 'soon' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const email = ref('')
const company = ref('') // honeypot — gerçek kullanıcı görmez/doldurmaz
const state = ref<State>('idle')
const invalid = ref(false)

const emailValid = computed(() => EMAIL_RE.test(email.value.trim()))
// Kutlama: kayıt yeni de olsa ("done") zaten kayıtlı da olsa ("exists") kutlarız.
const celebrating = computed(() => state.value === 'done' || state.value === 'exists')

// Konfeti parçacıkları — marka renklerinde, rastgele-görünümlü ama deterministik.
const confetti = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  hue: ['bg-brand', 'bg-brand-mint', 'bg-tahil', 'bg-meyve', 'bg-sut'][i % 5],
  delay: `${(i % 7) * 90}ms`,
  duration: `${1100 + (i % 5) * 260}ms`,
  drift: `${((i % 6) - 3) * 18}px`,
  rotate: `${(i % 2 ? 1 : -1) * (140 + (i % 4) * 80)}deg`,
}))

async function submit() {
  invalid.value = false
  if (state.value === 'sending') return
  if (!emailValid.value) {
    invalid.value = true
    return
  }
  state.value = 'sending'
  try {
    const res = await $fetch<{ status: 'ok' | 'exists' | 'soon' }>('/api/waitlist', {
      method: 'POST',
      body: { email: email.value.trim(), source: 'landing', company: company.value },
    })
    state.value = res.status === 'ok' ? 'done' : res.status === 'exists' ? 'exists' : 'soon'
  } catch (err: unknown) {
    // 503 → DB yok → "soon"; 422 → geçersiz e-posta; diğer → genel hata.
    const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode
    if (status === 503) state.value = 'soon'
    else if (status === 422) {
      invalid.value = true
      state.value = 'idle'
    } else state.value = 'error'
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <!-- BAŞARI / ZATEN KAYITLI: kutlama kartı -->
    <Transition name="celebrate">
      <div
        v-if="celebrating"
        class="relative overflow-hidden rounded-3xl border border-brand/20 bg-brand-mint/25 px-6 py-7"
        role="status"
        aria-live="polite"
      >
        <!-- konfeti yağmuru -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span
            v-for="(c, i) in confetti"
            :key="i"
            class="confetti absolute -top-3 h-2.5 w-2.5 rounded-[2px]"
            :class="c.hue"
            :style="{
              left: c.left,
              animationDelay: c.delay,
              animationDuration: c.duration,
              '--drift': c.drift,
              '--spin': c.rotate,
            }"
          />
        </div>

        <div class="relative flex items-center gap-4">
          <AfiMascot class="celebrate-pop h-14 w-14 shrink-0" />
          <div class="text-left">
            <p class="text-lg font-extrabold text-brand-ink">
              {{ state === 'done' ? cta.formDone : cta.formExists }}
            </p>
            <p class="mt-0.5 font-semibold text-brand-deep/80">
              {{ state === 'done' ? cta.formDoneSub : cta.formExistsSub }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ÇOK YAKINDA: DB bağlı değil -->
    <p
      v-if="state === 'soon'"
      class="rounded-full bg-brand-mint/40 px-6 py-3.5 text-center font-extrabold text-brand-deep"
      role="status"
    >
      {{ cta.formSoon }}
    </p>

    <!-- FORM -->
    <form v-else-if="!celebrating" novalidate @submit.prevent="submit">
      <div class="flex flex-col gap-3 sm:flex-row">
        <div class="min-w-0 flex-1">
          <label class="sr-only" for="waitlist-email">E-posta adresin</label>
          <input
            id="waitlist-email"
            v-model="email"
            type="email"
            name="email"
            inputmode="email"
            autocomplete="email"
            :aria-invalid="invalid"
            aria-describedby="waitlist-hint"
            :placeholder="cta.formPlaceholder"
            class="w-full rounded-full border bg-canvas px-5 py-3.5 font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
            :class="invalid ? 'border-meyve ring-4 ring-meyve/10' : 'border-line'"
            @input="invalid = false"
          />
        </div>

        <!-- honeypot: ekran dışı, ekran okuyuculardan gizli, botlar için yem -->
        <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label for="wl-company">Şirket (boş bırak)</label>
          <input
            id="wl-company"
            v-model="company"
            type="text"
            name="company"
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <button type="submit" class="btn-primary shrink-0" :disabled="state === 'sending'">
          <span
            v-if="state === 'sending'"
            class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          {{ state === 'sending' ? cta.formSending : cta.formButton }}
        </button>
      </div>

      <!-- yardım / hata satırı -->
      <p
        id="waitlist-hint"
        class="mt-3 min-h-5 text-center text-sm font-semibold"
        :class="invalid || state === 'error' ? 'text-meyve' : 'text-muted'"
        aria-live="polite"
      >
        <template v-if="invalid">{{ cta.formInvalid }}</template>
        <template v-else-if="state === 'error'">{{ cta.formError }}</template>
        <template v-else>{{ cta.privacy }}</template>
      </p>
    </form>
  </div>
</template>

<style scoped>
/* Kutlama kartının girişi */
.celebrate-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.5s cubic-bezier(0.22, 1.4, 0.4, 1);
}
.celebrate-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(8px);
}

/* Afi'nin zıplayışı */
.celebrate-pop {
  animation: celebrate-pop 0.6s cubic-bezier(0.22, 1.4, 0.4, 1) both;
}
@keyframes celebrate-pop {
  0% {
    transform: scale(0.4) rotate(-12deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.15) rotate(6deg);
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

/* Konfeti düşüşü */
.confetti {
  animation-name: confetti-fall;
  animation-timing-function: cubic-bezier(0.4, 0.2, 0.6, 1);
  animation-iteration-count: 1;
  animation-fill-mode: both;
  opacity: 0.9;
}
@keyframes confetti-fall {
  0% {
    transform: translate(0, -10px) rotate(0);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--drift, 0), 220px) rotate(var(--spin, 180deg));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebrate-enter-active,
  .celebrate-pop,
  .confetti {
    animation: none;
    transition: none;
  }
  .confetti {
    display: none;
  }
}
</style>
