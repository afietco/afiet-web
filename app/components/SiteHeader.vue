<template>
  <header class="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
      <a href="#icerik" class="flex items-center gap-2.5" aria-label="afiet — başa dön">
        <AfiMascot class="h-9 w-9" />
        <span class="text-2xl font-extrabold tracking-tight text-brand">afiet</span>
      </a>
      <nav class="flex items-center gap-2 sm:gap-6" aria-label="Sayfa içi">
        <a
          href="#neden"
          class="hidden font-bold text-soft transition hover:text-brand-deep sm:block"
        >
          Neden afiet?
        </a>
        <a href="#haber" class="btn-primary !px-5 !py-2.5 text-sm">Haber ver</a>
      </nav>
    </div>
  </header>
</template>
