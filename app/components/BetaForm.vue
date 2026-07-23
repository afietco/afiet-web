<script setup lang="ts">
import { betaForm } from '~/data/content'

/**
 * Beta başvuru formu (çok adımlı). /api/beta/apply'a POST eder; o da Neon'a yazar.
 * DB bağlı değilken route "soon" döner ve form zarifçe "çok yakında" moduna geçer.
 * Zorunlu: e-posta (Adım 1), platform + hedef (Adım 2), onay (Adım 3).
 */
type State = 'idle' | 'sending' | 'done' | 'exists' | 'soon' | 'error'

const c = betaForm
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const step = ref(1)
const state = ref<State>('idle')
const stepError = ref('')

// Alanlar
const email = ref('')
const company = ref('') // honeypot
const platform = ref('')
const goals = ref<string[]>([])
const counting = ref('')
const appsNutrition = ref<string[]>([])
const appsActivity = ref<string[]>([])
const appsBody = ref<string[]>([])
const appsOther = ref('')
const contact = ref('')
const heard = ref('')
const consent = ref(false)

const emailValid = computed(() => EMAIL_RE.test(email.value.trim()))
const celebrating = computed(() => state.value === 'done' || state.value === 'exists')
const progress = computed(() => `${Math.round((step.value / 3) * 100)}%`)

// Uygulama grubunun ref'ini anahtarından bul.
function appGroup(key: string) {
  return key === 'nutrition' ? appsNutrition : key === 'activity' ? appsActivity : appsBody
}

// Çoklu seçim (uygulamalar). "Hiçbiri" seçilince grup temizlenir, tersi de geçerli.
function toggleApp(key: string, value: string) {
  const group = appGroup(key)
  const arr = group.value
  if (value === 'hicbiri') {
    group.value = arr.includes('hicbiri') ? [] : ['hicbiri']
    return
  }
  const rest = arr.filter((v) => v !== 'hicbiri')
  group.value = rest.includes(value) ? rest.filter((v) => v !== value) : [...rest, value]
}

// Çoklu seçim (hedefler).
function toggleGoal(value: string) {
  goals.value = goals.value.includes(value)
    ? goals.value.filter((v) => v !== value)
    : [...goals.value, value]
}

// Tek seçim (aç/kapa: aynısına tekrar basınca kalkar).
function pickSingle(current: string, value: string) {
  return current === value ? '' : value
}

function chip(active: boolean) {
  return active
    ? 'border-brand bg-brand text-white'
    : 'border-line bg-canvas text-soft hover:border-brand/40'
}

function next1() {
  stepError.value = ''
  if (!emailValid.value) {
    stepError.value = c.status.invalidEmail
    return
  }
  step.value = 2
}

function next2() {
  stepError.value = ''
  if (!platform.value || goals.value.length === 0) {
    stepError.value = c.status.missingStep2
    return
  }
  step.value = 3
}

function back() {
  stepError.value = ''
  if (step.value > 1) step.value -= 1
}

async function submit() {
  stepError.value = ''
  if (!consent.value) {
    stepError.value = c.status.consentRequired
    return
  }
  if (state.value === 'sending') return
  state.value = 'sending'
  try {
    const res = await $fetch<{ status: 'ok' | 'exists' | 'soon' }>('/api/beta/apply', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        platform: platform.value,
        goals: goals.value,
        countingFeeling: counting.value,
        appsNutrition: appsNutrition.value,
        appsActivity: appsActivity.value,
        appsBody: appsBody.value,
        appsOther: appsOther.value.trim(),
        contactChannel: contact.value,
        heardFrom: heard.value,
        consent: consent.value,
        source: 'beta',
        company: company.value,
      },
    })
    state.value = res.status === 'ok' ? 'done' : res.status === 'exists' ? 'exists' : 'soon'
  } catch (err: unknown) {
    const status =
      (err as { status?: number; statusCode?: number })?.status ??
      (err as { statusCode?: number })?.statusCode
    if (status === 503) state.value = 'soon'
    else state.value = 'error'
  }
}

// Kutlama konfetisi — marka renklerinde, deterministik.
const confetti = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  hue: ['bg-brand', 'bg-brand-mint', 'bg-tahil', 'bg-meyve', 'bg-sut'][i % 5],
  delay: `${(i % 7) * 90}ms`,
  duration: `${1100 + (i % 5) * 260}ms`,
  drift: `${((i % 6) - 3) * 18}px`,
  rotate: `${(i % 2 ? 1 : -1) * (140 + (i % 4) * 80)}deg`,
}))
</script>

<template>
  <div class="mx-auto max-w-xl text-left">
    <!-- BAŞARI / ZATEN KAYITLI: kutlama kartı -->
    <Transition name="celebrate">
      <div
        v-if="celebrating"
        class="relative overflow-hidden rounded-3xl border border-brand/20 bg-brand-mint/25 px-6 py-7"
        role="status"
        aria-live="polite"
      >
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span
            v-for="(cf, i) in confetti"
            :key="i"
            class="confetti absolute -top-3 h-2.5 w-2.5 rounded-[2px]"
            :class="cf.hue"
            :style="{
              left: cf.left,
              animationDelay: cf.delay,
              animationDuration: cf.duration,
              '--drift': cf.drift,
              '--spin': cf.rotate,
            }"
          />
        </div>
        <div class="relative flex items-center gap-4">
          <AfiMascot class="celebrate-pop h-14 w-14 shrink-0" />
          <div>
            <p class="text-lg font-extrabold text-brand-ink">
              {{ state === 'done' ? c.status.done : c.status.exists }}
            </p>
            <p class="mt-0.5 font-semibold text-brand-deep/80">
              {{ state === 'done' ? c.status.doneSub : c.status.existsSub }}
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
      {{ c.status.soon }}
    </p>

    <!-- ÇOK ADIMLI FORM -->
    <form v-else-if="!celebrating" novalidate @submit.prevent="step === 3 ? submit() : next2()">
      <!-- İlerleme çubuğu -->
      <div class="mb-7">
        <div class="mb-2 flex items-center justify-between text-xs font-extrabold tracking-[0.14em] text-muted uppercase">
          <span>{{ c.stepNames[step - 1] }}</span>
          <span>Adım {{ step }} / 3</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-line">
          <div class="h-full rounded-full bg-brand transition-all duration-500" :style="{ width: progress }" />
        </div>
      </div>

      <!-- honeypot -->
      <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label for="bf-company">Şirket (boş bırak)</label>
        <input id="bf-company" v-model="company" type="text" name="company" tabindex="-1" autocomplete="off" />
      </div>

      <!-- ADIM 1 — E-posta -->
      <div v-if="step === 1">
        <h3 class="text-2xl font-black tracking-[-0.02em] text-brand-ink">{{ c.step1.title }}</h3>
        <p class="mt-2 font-semibold text-soft">{{ c.step1.lead }}</p>
        <label class="sr-only" for="bf-email">{{ c.step1.emailLabel }}</label>
        <input
          id="bf-email"
          v-model="email"
          type="email"
          name="email"
          inputmode="email"
          autocomplete="email"
          :placeholder="c.step1.emailPlaceholder"
          class="mt-6 w-full rounded-full border border-line bg-canvas px-5 py-3.5 font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          @input="stepError = ''"
          @keydown.enter.prevent="next1"
        />
        <div class="mt-6 flex justify-end">
          <button type="button" class="btn-primary" @click="next1">{{ c.step1.next }}</button>
        </div>
      </div>

      <!-- ADIM 2 — Seni tanıyalım -->
      <div v-else-if="step === 2" class="space-y-8">
        <h3 class="text-2xl font-black tracking-[-0.02em] text-brand-ink">{{ c.step2.title }}</h3>

        <fieldset>
          <legend class="font-black text-brand-ink">{{ c.step2.platformLabel }}</legend>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <button
              v-for="p in c.step2.platforms"
              :key="p.value"
              type="button"
              :aria-pressed="platform === p.value"
              class="rounded-2xl border px-5 py-4 text-base font-black transition"
              :class="chip(platform === p.value)"
              @click="platform = pickSingle(platform, p.value)"
            >
              {{ p.label }}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-black text-brand-ink">{{ c.step2.goalLabel }}</legend>
          <p class="mt-1 text-sm font-semibold text-muted">{{ c.step2.goalHint }}</p>
          <div class="mt-3 flex flex-wrap gap-2.5">
            <button
              v-for="g in c.step2.goals"
              :key="g.value"
              type="button"
              :aria-pressed="goals.includes(g.value)"
              class="rounded-full border px-4 py-2 text-sm font-bold transition"
              :class="chip(goals.includes(g.value))"
              @click="toggleGoal(g.value)"
            >
              {{ g.label }}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-black text-brand-ink">{{ c.step2.countingLabel }}</legend>
          <p class="mt-1 text-sm font-semibold text-muted">{{ c.step2.countingHint }}</p>
          <div class="mt-3 flex flex-wrap gap-2.5">
            <button
              v-for="o in c.step2.counting"
              :key="o.value"
              type="button"
              :aria-pressed="counting === o.value"
              class="rounded-full border px-4 py-2 text-sm font-bold transition"
              :class="chip(counting === o.value)"
              @click="counting = pickSingle(counting, o.value)"
            >
              {{ o.label }}
            </button>
          </div>
        </fieldset>

        <div class="flex items-center justify-between">
          <button type="button" class="font-bold text-soft hover:text-brand-ink" @click="back">
            {{ c.step2.back }}
          </button>
          <button type="button" class="btn-primary" @click="next2">{{ c.step2.next }}</button>
        </div>
      </div>

      <!-- ADIM 3 — Alışkanlıklar ve iletişim -->
      <div v-else class="space-y-8">
        <div>
          <h3 class="text-2xl font-black tracking-[-0.02em] text-brand-ink">{{ c.step3.title }}</h3>
          <p class="mt-2 font-semibold text-soft">{{ c.step3.lead }}</p>
        </div>

        <fieldset>
          <legend class="font-black text-brand-ink">{{ c.step3.appsLabel }}</legend>
          <p class="mt-1 text-sm font-semibold text-muted">{{ c.step3.appsHint }}</p>
          <div class="mt-4 space-y-5">
            <div v-for="grp in c.step3.appGroups" :key="grp.key">
              <p class="text-sm font-extrabold tracking-[0.1em] text-brand uppercase">{{ grp.label }}</p>
              <div class="mt-2.5 flex flex-wrap gap-2.5">
                <button
                  v-for="o in grp.options"
                  :key="o.value"
                  type="button"
                  :aria-pressed="appGroup(grp.key).value.includes(o.value)"
                  class="rounded-full border px-3.5 py-1.5 text-sm font-bold transition"
                  :class="chip(appGroup(grp.key).value.includes(o.value))"
                  @click="toggleApp(grp.key, o.value)"
                >
                  {{ o.label }}
                </button>
              </div>
            </div>
          </div>
          <input
            v-model="appsOther"
            type="text"
            :placeholder="c.step3.appsOtherPlaceholder"
            maxlength="200"
            class="mt-4 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </fieldset>

        <fieldset>
          <legend class="font-black text-brand-ink">{{ c.step3.contactLabel }}</legend>
          <div class="mt-3 flex flex-wrap gap-2.5">
            <button
              v-for="o in c.step3.contact"
              :key="o.value"
              type="button"
              :aria-pressed="contact === o.value"
              class="rounded-full border px-4 py-2 text-sm font-bold transition"
              :class="chip(contact === o.value)"
              @click="contact = pickSingle(contact, o.value)"
            >
              {{ o.label }}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-black text-brand-ink">{{ c.step3.heardLabel }}</legend>
          <div class="mt-3 flex flex-wrap gap-2.5">
            <button
              v-for="o in c.step3.heard"
              :key="o.value"
              type="button"
              :aria-pressed="heard === o.value"
              class="rounded-full border px-4 py-2 text-sm font-bold transition"
              :class="chip(heard === o.value)"
              @click="heard = pickSingle(heard, o.value)"
            >
              {{ o.label }}
            </button>
          </div>
        </fieldset>

        <!-- KVKK onayı -->
        <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-canvas p-4">
          <input
            v-model="consent"
            type="checkbox"
            class="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            @change="stepError = ''"
          />
          <span class="text-sm font-semibold text-soft">
            {{ c.step3.consentText }}
            <NuxtLink :to="c.step3.consentLinkHref" class="font-bold text-brand underline">
              {{ c.step3.consentLinkLabel }}
            </NuxtLink>
          </span>
        </label>

        <div class="flex items-center justify-between">
          <button type="button" class="font-bold text-soft hover:text-brand-ink" @click="back">
            {{ c.step3.back }}
          </button>
          <button type="submit" class="btn-primary" :disabled="state === 'sending'">
            <span
              v-if="state === 'sending'"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
            {{ state === 'sending' ? c.status.sending : c.step3.submit }}
          </button>
        </div>
      </div>

      <!-- hata / uyarı satırı -->
      <p
        v-if="stepError || state === 'error'"
        class="mt-4 text-center text-sm font-semibold text-meyve"
        aria-live="polite"
      >
        {{ state === 'error' ? c.status.error : stepError }}
      </p>
    </form>
  </div>
</template>

<style scoped>
.celebrate-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.5s cubic-bezier(0.22, 1.4, 0.4, 1);
}
.celebrate-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(8px);
}

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
