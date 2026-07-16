<template>
  <header class="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
      <NuxtLink to="/" class="flex items-center gap-2.5" aria-label="afiet — ana sayfa">
        <AfiMascot class="h-9 w-9" />
        <span class="text-2xl font-extrabold tracking-tight text-brand">afiet</span>
      </NuxtLink>
      <nav class="flex items-center gap-2 sm:gap-6" aria-label="Sayfa içi">
        <NuxtLink
          to="/#neden"
          class="hidden font-bold text-soft transition hover:text-brand-deep sm:block"
        >
          Neden afiet?
        </NuxtLink>
        <NuxtLink
          to="/blog"
          class="hidden font-bold text-soft transition hover:text-brand-deep sm:block"
        >
          Blog
        </NuxtLink>
        <NuxtLink to="/#haber" class="btn-primary !px-5 !py-2.5 text-sm">Haber ver</NuxtLink>
      </nav>
    </div>
  </header>
</template>
