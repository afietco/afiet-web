<script setup lang="ts">
import { iletisim, type Accent } from '~/data/content'

/**
 * İletişim: kartpostal metaforu (kullanıcı kararı, 5 Ağu 2026). Sol yüz mesaj,
 * sağ yüz pul + adres satırları; "Postala" ile POST /api/iletisim üzerinden
 * Resend'e gider (beta bildirimleriyle aynı posta yolu). Standart form
 * bilinçli olarak YOK: sayfa markanın "sofrada seni seven biri" tonunu taşır.
 *
 * Pul (konu) seçimi zorunlu değildir; seçilmezse mail konusu "Kartpostal"
 * olur. KVKK onay kutusu değil bilgilendirme satırıdır (kullanıcı kararı).
 */
usePageSeo()

const STAMP_BG: Record<Accent, string> = {
  sebze: 'bg-sebze/12 border-sebze/50 text-sebze',
  meyve: 'bg-meyve/12 border-meyve/50 text-meyve',
  protein: 'bg-protein/12 border-protein/50 text-protein',
  tahil: 'bg-tahil/12 border-tahil/50 text-tahil',
  sut: 'bg-sut/12 border-sut/50 text-sut',
}

const topic = ref<string | null>(null)
const message = ref('')
const name = ref('')
const email = ref('')
const company = ref('') // honeypot: beta formuyla aynı sözleşme
const state = ref<'idle' | 'sending' | 'done'>('idle')
const note = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const selectedTopic = computed(() => iletisim.topics.find((t) => t.key === topic.value) ?? null)

async function submit() {
  if (!message.value.trim()) {
    note.value = iletisim.missingMessage
    return
  }
  if (!EMAIL_RE.test(email.value.trim())) {
    note.value = iletisim.invalidEmail
    return
  }
  note.value = ''
  state.value = 'sending'
  try {
    await $fetch('/api/iletisim', {
      method: 'POST',
      body: {
        topic: topic.value,
        name: name.value.trim(),
        email: email.value.trim().toLowerCase(),
        message: message.value.trim(),
        company: company.value,
      },
    })
    state.value = 'done'
  } catch {
    state.value = 'idle'
    note.value = iletisim.error
  }
}

function again() {
  topic.value = null
  message.value = ''
  state.value = 'idle'
  note.value = ''
}
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- sofra ışığı: ana sayfadaki hero lekelerinin sakin akrabası -->
    <div class="pointer-events-none absolute -top-40 -left-44 h-[30rem] w-[30rem] rounded-full bg-brand-mint/35 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute top-1/4 -right-52 h-[26rem] w-[26rem] rounded-full bg-[#fde68a]/40 blur-3xl" aria-hidden="true" />

    <div class="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <header class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-extrabold tracking-wide text-brand">{{ iletisim.eyebrow }}</p>
        <h1 class="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
          {{ iletisim.title }}
        </h1>
        <p class="mt-4 text-[17px] leading-relaxed text-soft">{{ iletisim.sub }}</p>
      </header>

      <!-- ================= KARTPOSTAL ================= -->
      <div class="mx-auto mt-12 max-w-3xl">
        <!-- gönderildi hali -->
        <div
          v-if="state === 'done'"
          class="rotate-[-0.5deg] rounded-[28px] border border-brand/25 bg-surface p-10 text-center shadow-float"
          role="status"
        >
          <div class="relative mx-auto h-24 w-24">
            <div
              class="pointer-events-none absolute top-1/2 left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand/20 motion-safe:animate-[spin_60s_linear_infinite]"
              aria-hidden="true"
            />
            <AfiMascot class="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-float" />
          </div>
          <h2 class="mt-8 font-display text-3xl font-semibold tracking-tight text-ink">
            {{ iletisim.successTitle }}
          </h2>
          <p class="mx-auto mt-3 max-w-md leading-relaxed font-semibold text-soft">
            {{ iletisim.successBody }}
          </p>
          <button type="button" class="btn-ghost mt-8" @click="again">
            {{ iletisim.successAgain }}
          </button>
        </div>

        <!-- kartın kendisi -->
        <form v-else novalidate @submit.prevent="submit">
          <div
            class="kart relative rotate-[-0.8deg] overflow-hidden rounded-[28px] border border-line bg-[#fffdf6] shadow-float transition-transform duration-500 focus-within:rotate-0"
          >
            <div class="grid sm:grid-cols-[1.15fr_0.85fr]">
              <!-- SOL YÜZ: mesaj -->
              <div class="p-7 sm:p-8">
                <p class="font-display text-2xl font-semibold tracking-tight text-ink italic">
                  {{ iletisim.cardTo }}
                </p>
                <label class="sr-only" for="kart-mesaj">{{ iletisim.messageLabel }}</label>
                <textarea
                  id="kart-mesaj"
                  v-model="message"
                  rows="7"
                  :placeholder="iletisim.messagePlaceholder"
                  class="satirli mt-3 w-full resize-none bg-transparent leading-8 font-semibold text-ink placeholder:text-muted focus:outline-none"
                />
              </div>

              <!-- SAĞ YÜZ: pul + adres. Gerçek kartpostaldaki gibi dikey ayraçlı. -->
              <div class="relative border-t border-dashed border-line p-7 sm:border-t-0 sm:border-l sm:p-8">
                <!-- pul köşesi -->
                <div class="flex items-start justify-end">
                  <div class="relative">
                    <!-- damga: pulun üstüne taşan posta mührü -->
                    <svg
                      class="pointer-events-none absolute -top-3 -left-12 h-16 w-16 text-ink/15"
                      viewBox="0 0 64 64"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle cx="32" cy="32" r="26" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 4" />
                      <circle cx="32" cy="32" r="19" stroke="currentColor" stroke-width="1" />
                      <path id="muhur-yay" d="M32 15a17 17 0 1 1 0 34 17 17 0 0 1 0-34" fill="none" />
                      <text style="font-size: 7.5px; font-weight: 800; letter-spacing: 1.5px" fill="currentColor">
                        <textPath href="#muhur-yay" startOffset="6">AFİET POSTA · 2026</textPath>
                      </text>
                    </svg>

                    <!-- pul çerçevesi: tırtıklı kenar hissi için beyaz zemin + noktalı çerçeve -->
                    <div
                      class="flex h-20 w-16 items-center justify-center rounded-sm bg-white p-1 shadow-lift"
                      :class="selectedTopic ? 'rotate-3' : ''"
                    >
                      <div
                        v-if="selectedTopic"
                        class="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[2px] border-2 border-dotted"
                        :class="STAMP_BG[selectedTopic.accent]"
                      >
                        <AfiMascot class="h-7 w-7" />
                        <span class="px-1 text-center text-[9px] leading-tight font-extrabold">
                          {{ selectedTopic.label }}
                        </span>
                      </div>
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center rounded-[2px] border-2 border-dotted border-line text-center text-[9px] font-bold text-muted"
                      >
                        pul<br />buraya
                      </div>
                    </div>
                  </div>
                </div>

                <!-- pul seçimi -->
                <fieldset class="mt-5">
                  <legend class="text-xs font-extrabold tracking-wide text-muted">
                    {{ iletisim.stampLegend }}
                  </legend>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-for="t in iletisim.topics"
                      :key="t.key"
                      type="button"
                      :aria-pressed="topic === t.key"
                      class="rounded-full border px-3 py-1.5 text-xs font-extrabold transition hover:-translate-y-0.5"
                      :class="
                        topic === t.key
                          ? STAMP_BG[t.accent] + ' shadow-lift'
                          : 'border-line bg-surface text-soft hover:border-brand/40'
                      "
                      @click="topic = topic === t.key ? null : t.key"
                    >
                      {{ t.label }}
                    </button>
                  </div>
                </fieldset>

                <!-- adres satırları -->
                <div class="mt-6 space-y-4">
                  <div>
                    <label class="text-xs font-extrabold tracking-wide text-muted" for="kart-kimden">
                      {{ iletisim.nameLabel }}
                    </label>
                    <input
                      id="kart-kimden"
                      v-model="name"
                      type="text"
                      autocomplete="name"
                      :placeholder="iletisim.namePlaceholder"
                      class="w-full border-b-2 border-line bg-transparent py-1.5 font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-extrabold tracking-wide text-muted" for="kart-eposta">
                      {{ iletisim.emailLabel }}
                    </label>
                    <input
                      id="kart-eposta"
                      v-model="email"
                      type="email"
                      autocomplete="email"
                      :placeholder="iletisim.emailPlaceholder"
                      class="w-full border-b-2 border-line bg-transparent py-1.5 font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <!-- honeypot -->
                <input
                  v-model="company"
                  type="text"
                  name="company"
                  tabindex="-1"
                  autocomplete="off"
                  aria-hidden="true"
                  class="absolute h-0 w-0 opacity-0"
                />
              </div>
            </div>
          </div>

          <p v-if="note" class="mt-4 text-center text-sm font-bold text-protein" role="alert">
            {{ note }}
          </p>

          <div class="mt-6 flex flex-col items-center gap-3">
            <button type="submit" class="btn-primary !px-8 !py-3.5" :disabled="state === 'sending'">
              {{ state === 'sending' ? iletisim.sending : iletisim.submit }}
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
            <p class="max-w-md text-center text-xs leading-relaxed font-semibold text-muted">
              {{ iletisim.kvkk }}
              <NuxtLink to="/gizlilik" class="underline decoration-line underline-offset-2 transition hover:text-brand-deep">
                Gizlilik
              </NuxtLink>
            </p>
          </div>
        </form>
      </div>

      <!-- ================= DİĞER KAPILAR ================= -->
      <div class="mx-auto mt-16 grid max-w-4xl gap-5 sm:grid-cols-2">
        <div class="rounded-3xl border border-line bg-surface p-7 shadow-lift">
          <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ iletisim.socialTitle }}
          </h2>
          <p class="mt-1.5 text-sm leading-relaxed font-semibold text-soft">{{ iletisim.socialSub }}</p>
          <SocialIcons size="lg" class="mt-4" />
        </div>
        <div class="rounded-3xl border border-line bg-surface p-7 shadow-lift">
          <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ iletisim.mailTitle }}
          </h2>
          <p class="mt-1.5 text-sm leading-relaxed font-semibold text-soft">{{ iletisim.mailBody }}</p>
          <a
            :href="`mailto:${iletisim.mailAddress}`"
            class="mt-4 inline-flex items-center gap-2 font-extrabold text-brand transition hover:text-brand-deep"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="m2 7 10 7L22 7" />
            </svg>
            {{ iletisim.mailAddress }}
          </a>
        </div>
      </div>

      <!-- bülten: kartpostalın kardeşi -->
      <div class="mx-auto mt-5 max-w-4xl rounded-3xl border border-line bg-surface p-7 shadow-lift">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-sm">
            <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
              Sofradan mektubun olsun
            </h2>
            <p class="mt-1.5 text-sm leading-relaxed font-semibold text-soft">
              Kartpostal tek seferlik; bülten düzenli. İstersen ikisini de gönderelim.
            </p>
          </div>
          <BultenForm source="iletisim" class="w-full sm:max-w-sm" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mektup kağıdı: satır çizgileri leading-8 (2rem) ile aynı adımda akar,
   yazı çizginin ÜSTÜNE oturur. Renk --color-line'ın yumuşatılmışı. */
.satirli {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(2rem - 1px),
    rgb(236 228 212 / 0.9) calc(2rem - 1px),
    rgb(236 228 212 / 0.9) 2rem
  );
}

/* Kartpostal kağıdı: çok hafif keten dokusu, gövdedeki grain ile akraba. */
.kart {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
}
</style>
