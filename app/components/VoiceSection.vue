<script setup lang="ts">
import { voice } from '~/data/content'

/* Balonlar hafif kaydırmalarla dizilir — sohbet gibi, ızgara gibi değil. */
const offsets = ['sm:ml-0', 'sm:ml-14', 'sm:ml-5', 'sm:ml-20']
</script>

<template>
  <section aria-labelledby="ses-baslik">
    <div class="mx-auto max-w-6xl px-5">
      <div
        class="relative overflow-hidden rounded-[48px] bg-brand-ink px-6 py-16 sm:px-12 md:px-16 md:py-20"
      >
        <!-- koyu kasede buhar ışığı -->
        <div class="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-brand-bright/20 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -right-20 -bottom-28 h-80 w-80 rounded-full bg-brand-deep/40 blur-3xl" aria-hidden="true" />

        <div class="relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p v-reveal class="text-sm font-extrabold tracking-wide text-brand-bright uppercase">
              {{ voice.eyebrow }}
            </p>
            <h2
              id="ses-baslik"
              v-reveal="80"
              class="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl"
            >
              {{ voice.title }}
            </h2>
            <p v-reveal="160" class="mt-4 text-lg leading-relaxed font-semibold text-brand-mint">
              {{ voice.sub }}
            </p>
          </div>

          <ul class="space-y-4" role="list">
            <li
              v-for="(message, i) in voice.messages"
              :key="message"
              v-reveal="i * 130"
              class="flex max-w-md items-end gap-2.5"
              :class="offsets[i]"
            >
              <AfiMascot class="h-8 w-8 shrink-0" />
              <p
                class="rounded-3xl rounded-bl-md bg-surface px-5 py-3 font-bold text-ink shadow-lift"
              >
                {{ message }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
