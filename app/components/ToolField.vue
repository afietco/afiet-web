<script setup lang="ts">
import { sayiyaCevir } from '#shared/hesap/girdi'
import { cmToFtIn, cmToIn, ftInToCm, inToCm, kgToLb, lbToKg } from '#shared/hesap/birim'

/**
 * İngilizce hesaplayıcıların sayı alanı (TR'deki `HesapAlan`ın imperial
 * bilen kardeşi). Dışarıya HER ZAMAN metrik değer verir (cm ya da kg), yani
 * motor iki dilde de aynı sayıyı görür; dönüşüm bu bileşenin içinde biter.
 *
 * `kind`:
 *   plain  - dönüşümsüz sayı (yaş)
 *   weight - metrik kg, imperial lb
 *   length - metrik cm, imperial inç (bel, boyun, kalça)
 *   height - metrik tek cm alanı, imperial ft + in ÇİFT alanı
 *
 * `ornek` metrik örnektir; imperial görünümdeki yer tutucular ondan türer,
 * yani örnek değerler iki sistemde de aynı insanı tarif eder.
 */
const model = defineModel<number | null>({ required: true })

const props = defineProps<{
  label: string
  kind: 'plain' | 'weight' | 'length' | 'height'
  imperial: boolean
  /** Metrik örnek: cm, kg ya da düz sayı. */
  ornek: number
}>()

const raw = ref('')
const rawFt = ref('')
const rawIn = ref('')

/** Sistem değişince yazılanlar anlamını yitirir; alan da sonuç da sıfırlanır. */
watch(
  () => props.imperial,
  () => {
    raw.value = ''
    rawFt.value = ''
    rawIn.value = ''
    model.value = null
  },
)

const unit = computed(() => {
  if (props.kind === 'plain') return ''
  if (props.kind === 'weight') return props.imperial ? 'lb' : 'kg'
  return props.imperial ? 'in' : 'cm'
})

const ornekMetin = computed(() => {
  if (props.kind === 'plain') return String(props.ornek)
  if (!props.imperial) return String(props.ornek)
  if (props.kind === 'weight') return String(Math.round(kgToLb(props.ornek)))
  return String(Math.round(cmToIn(props.ornek)))
})

const ornekFtIn = computed(() => cmToFtIn(props.ornek))

/** Alanlar → metrik model. Boş ya da sayı olmayan girdi null'dır. */
watchEffect(() => {
  if (props.kind === 'height' && props.imperial) {
    const ft = sayiyaCevir(rawFt.value)
    const inch = sayiyaCevir(rawIn.value)
    // Yalnız foot yazmak geçerlidir (5 ft); yalnız inç yazmak değil.
    model.value = ft === null ? null : ftInToCm(ft, inch ?? 0)
    return
  }
  const n = sayiyaCevir(raw.value)
  if (n === null) {
    model.value = null
    return
  }
  if (!props.imperial || props.kind === 'plain') {
    model.value = n
    return
  }
  model.value = props.kind === 'weight' ? lbToKg(n) : inToCm(n)
})

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-lg font-bold text-ink transition placeholder:font-normal placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none'
</script>

<template>
  <!-- Imperial boy: iki alan tek etiketin altında, bu yüzden fieldset. -->
  <fieldset v-if="kind === 'height' && imperial">
    <legend class="text-sm font-extrabold text-soft">{{ label }}</legend>
    <div class="mt-1.5 grid grid-cols-2 gap-3">
      <label class="block">
        <span class="sr-only">{{ label }} (feet)</span>
        <div class="relative">
          <input
            v-model="rawFt"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="String(ornekFtIn.ft)"
            :class="inputClass"
            class="!mt-0 pr-10"
          />
          <span class="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm font-bold text-muted">
            ft
          </span>
        </div>
      </label>
      <label class="block">
        <span class="sr-only">{{ label }} (inches)</span>
        <div class="relative">
          <input
            v-model="rawIn"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="String(ornekFtIn.in)"
            :class="inputClass"
            class="!mt-0 pr-10"
          />
          <span class="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm font-bold text-muted">
            in
          </span>
        </div>
      </label>
    </div>
  </fieldset>

  <label v-else class="block">
    <span class="text-sm font-extrabold text-soft">
      {{ label }}<template v-if="unit"> ({{ unit }})</template>
    </span>
    <input
      v-model="raw"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="ornekMetin"
      :class="inputClass"
    />
  </label>
</template>
