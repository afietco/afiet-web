<script setup lang="ts">
import { askAfi } from '~/data/content'

/**
 * "Afi'ye sor" kartı. SSS listesinin altında durur; AskAfiSection sarmalar.
 *
 * Marka sözleşmesi (BRAND.md > Logo): AfiMascot bileşenine dokunulmaz — iki
 * buhar teli ve sabit yüz ifadesi korunur. Yalnız .afi-stage sarmalayıcısı
 * ruh hâli değiştirir ve Afi'nin üzgün hâli YOKTUR: hata, kota ve sınır
 * durumlarında mood idle'a döner.
 *
 * Cevap metni bilinçli olarak DÜZ METİN basılır: v-html ya da istemci tarafı
 * markdown yok. Ziyaretçinin yönlendirebildiği bir model çıktısını render
 * etmek gereksiz bir XSS ve marka hasarı yüzeyidir.
 */
const afi = useAskAfi()
// Site anahtarı gizli değildir, HTML'e basılır. Secret yalnız backend'dedir.
const turnstileSiteKey = String(useRuntimeConfig().public.turnstileSiteKey || '')
const inputEl = ref<HTMLInputElement | null>(null)
// NuxtLink'e konan ref bileşen örneğidir, DOM düğümü değil: $el üzerinden inilir.
const capLink = ref<{ $el?: HTMLElement } | null>(null)

const hintTone = computed(() =>
  afi.state.value === 'error' || afi.state.value === 'limit' ? 'text-meyve' : 'text-muted',
)

const showForm = computed(() => afi.state.value !== 'capped' && afi.state.value !== 'soon')

// Turnstile ilk gerçek etkileşimde ısıtılır, sayfa açılışında değil: SSS'yi
// okuyup çıkan ziyaretçi Cloudflare ile hiç temas etmesin.
function onFocus() {
  afi.focused.value = true
  void afi.turnstile.warmUp()
}

async function pickChip(chip: string) {
  void afi.turnstile.warmUp()
  await afi.ask(chip, chip)
  await nextTick()
  inputEl.value?.focus({ preventScroll: true })
}

function onSubmit() {
  if (afi.canSend.value) void afi.ask(afi.draft.value)
}

function onEsc() {
  if (afi.busy.value) afi.stop()
}

// Kota dolduğunda input etkisizleşir; odağı bir kez CTA'ya taşı ki klavye
// kullanıcısı boşlukta kalmasın.
watch(
  () => afi.state.value,
  async (s) => {
    if (s !== 'capped') return
    await nextTick()
    capLink.value?.$el?.focus?.({ preventScroll: true })
  },
)

/** Cevabı paragraflara böl (düz metin, markdown yok). */
function paragraphs(text: string) {
  return text.split(/\n{2,}/).filter(Boolean)
}
</script>

<template>
  <div
    class="mx-auto max-w-2xl rounded-[26px] border border-line bg-surface p-6 shadow-lift sm:p-7"
  >
    <!-- Afi ve davet -->
    <div class="flex items-start gap-4">
      <!-- Serbest duruşlu maskot (logo değil). 96 px, markanın boyut
           merdiveninde "boş durum" basamağı: panel açılışı tam olarak o an.
           Daha küçüğünde kase konturu (#ece4d4) beyaz kartta kayboluyor. -->
      <div class="afi-stage -mt-2 shrink-0" :data-mood="afi.mood.value" aria-hidden="true">
        <AfiPose class="h-24 w-24" />
      </div>
      <p class="pt-1 leading-relaxed font-bold text-ink">{{ askAfi.invitation }}</p>
    </div>

    <!-- Sohbet -->
    <ol v-if="afi.turns.value.length" class="mt-6 space-y-4" role="list">
      <li
        v-for="turn in afi.turns.value"
        :key="turn.id"
        class="flex gap-2.5"
        :class="turn.role === 'sen' ? 'items-end justify-end' : 'items-start'"
      >
        <!-- Balon avatarında LOGO kullanılır, maskot değil: logo tile üstünde
             yaşar ve 32 px'te okunur, tile'sız maskotun konturu ise bu boyutta
             yarım piksele düşüp beyaz kartta kayboluyor. VoiceSection'daki
             sohbet balonları da aynı deseni kullanıyor.
             Cevap çok satırlı olabildiği için Afi ilk satıra hizalanır. -->
        <AfiMascot v-if="turn.role === 'afi'" class="mt-0.5 h-8 w-8 shrink-0" />
        <div
          class="max-w-[85%] px-5 py-3 font-bold"
          :class="
            turn.role === 'afi'
              ? 'rounded-3xl rounded-tl-md bg-canvas text-ink'
              : 'rounded-3xl rounded-br-md bg-brand-mint/25 text-brand-ink'
          "
          :aria-busy="turn.streaming ? 'true' : undefined"
        >
          <!-- Afi düşünürken: henüz metin yok, üç nokta -->
          <span
            v-if="turn.role === 'afi' && turn.streaming && !turn.text"
            class="afi-dots inline-flex items-center gap-1"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-brand" />
            <span class="h-1.5 w-1.5 rounded-full bg-brand" />
            <span class="h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          <template v-else>
            <p
              v-for="(para, i) in paragraphs(turn.text)"
              :key="i"
              class="whitespace-pre-line"
              :class="i ? 'mt-2' : ''"
            >
              {{ para
              }}<span
                v-if="turn.streaming && i === paragraphs(turn.text).length - 1"
                class="afi-caret ml-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 bg-brand/70"
                aria-hidden="true"
              />
            </p>
          </template>

          <!-- Kaynak rozetleri: yalnız site içi yollar -->
          <p v-if="turn.sources?.length" class="mt-3 flex flex-wrap gap-2">
            <NuxtLink
              v-for="src in turn.sources"
              :key="src.url"
              :to="src.url"
              class="rounded-full border border-line bg-surface px-3 py-1 text-xs font-extrabold text-brand-deep transition hover:border-brand/40"
            >
              {{ src.title }}
            </NuxtLink>
          </p>
        </div>
      </li>
    </ol>

    <!-- Hazır soru çipleri -->
    <div v-if="afi.remainingChips.value.length && showForm" class="mt-6">
      <p class="text-sm font-extrabold text-muted">
        {{ afi.turns.value.length ? askAfi.moreChips : askAfi.chipsLabel }}
      </p>
      <div class="mt-2.5 flex flex-wrap gap-2">
        <button
          v-for="chip in afi.remainingChips.value"
          :key="chip"
          type="button"
          data-afi-chip
          class="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm font-extrabold text-ink shadow-lift transition hover:border-brand/40 hover:text-brand-deep disabled:opacity-50"
          :disabled="afi.busy.value"
          @click="pickChip(chip)"
        >
          <span class="h-2 w-2 shrink-0 rounded-full bg-brand-bright" aria-hidden="true" />
          {{ chip }}
        </button>
      </div>
    </div>

    <!-- Kota doldu -->
    <div v-if="afi.state.value === 'capped'" class="mt-6 rounded-3xl bg-brand-mint/25 px-5 py-5">
      <p class="leading-relaxed font-bold text-brand-ink">{{ askAfi.cap }}</p>
      <NuxtLink ref="capLink" :to="askAfi.capCtaTo" class="btn-primary mt-4">
        {{ askAfi.capCta }}
      </NuxtLink>
    </div>

    <!-- Backend hazır değil -->
    <p
      v-else-if="afi.state.value === 'soon'"
      class="mt-6 rounded-full bg-brand-mint/40 px-6 py-3.5 text-center font-extrabold text-brand-deep"
      role="status"
    >
      {{ askAfi.soon }}
    </p>

    <!-- Soru formu -->
    <form v-else class="mt-5" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col gap-3 sm:flex-row">
        <div class="min-w-0 flex-1">
          <label class="sr-only" for="afi-soru">{{ askAfi.inputLabel }}</label>
          <input
            id="afi-soru"
            ref="inputEl"
            v-model="afi.draft.value"
            type="text"
            name="soru"
            maxlength="280"
            autocomplete="off"
            enterkeyhint="send"
            aria-describedby="afi-hint"
            :disabled="afi.state.value === 'limit'"
            :placeholder="askAfi.placeholder"
            class="w-full rounded-full border border-line bg-canvas px-5 py-3.5 font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none disabled:opacity-60"
            @focus="onFocus"
            @blur="afi.focused.value = false"
            @keydown.esc="onEsc"
          />
        </div>

        <!-- honeypot: ekran dışı, ekran okuyuculardan gizli, botlar için yem -->
        <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label for="afi-company">Şirket (boş bırak)</label>
          <input
            id="afi-company"
            v-model="afi.company.value"
            type="text"
            name="company"
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <button
          v-if="afi.busy.value"
          type="button"
          class="btn-ghost shrink-0"
          @click="afi.stop()"
        >
          {{ askAfi.stop }}
        </button>
        <button v-else type="submit" class="btn-primary shrink-0" :disabled="!afi.canSend.value">
          {{ askAfi.send }}
        </button>
      </div>

      <!-- Turnstile kabı. Normal akışta durur ve boşken yer kaplamaz
           (empty:hidden): görünmez bir kapta gösterilen zorluk çözülemez ve
           panel kilitlenir. Yalnız site anahtarı varsa basılır. -->
      <div
        v-if="turnstileSiteKey"
        :ref="(el) => (afi.turnstile.host.value = el as HTMLElement | null)"
        class="cf-turnstile mt-3 empty:hidden"
        :data-sitekey="turnstileSiteKey"
        data-action="turnstile-spin-v2"
      />
      <p v-if="afi.turnstile.challenging.value" class="mt-2 text-center text-sm font-semibold text-muted">
        {{ askAfi.captchaCheck }}
      </p>

      <!-- yardım / hata satırı -->
      <p
        id="afi-hint"
        class="mt-3 min-h-5 text-center text-sm font-semibold"
        :class="hintTone"
        aria-live="polite"
      >
        <template v-if="afi.state.value === 'limit'">{{ askAfi.limit }}</template>
        <template v-else-if="afi.state.value === 'error'">
          {{ askAfi.error }}
          <button
            type="button"
            class="ml-1 underline underline-offset-2 hover:text-brand-deep"
            @click="afi.retry()"
          >
            {{ askAfi.retry }}
          </button>
        </template>
        <template v-else-if="afi.state.value === 'sending'">{{ askAfi.thinking }}</template>
        <template v-else>
          {{ askAfi.hint }}
          <NuxtLink :to="askAfi.privacyTo" class="underline underline-offset-2 hover:text-brand-deep">
            {{ askAfi.privacyLabel }}
          </NuxtLink>
        </template>
      </p>
    </form>

    <!-- Ekran okuyucu duyurusu: token token DEĞİL, yalnız durum geçişlerinde
         ve cevap tamamlandığında bir kez. Akan metni canlı bölgeye bağlamak
         ekran okuyucuda kullanılamaz bir gürültü üretir. -->
    <p class="sr-only" role="status" aria-live="polite">{{ afi.announce.value }}</p>
  </div>
</template>
