<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import Search from './Search.svelte';

  export let title: string | undefined = undefined;

  let path = '';
  let isOpen = false;
  let hamburgerBtn: HTMLButtonElement;
  let closeBtn: HTMLButtonElement;
  let drawerEl: HTMLElement | undefined;

  onMount(() => {
    path = window.location.pathname;
    const hint = document.getElementById('search-kbd-hint');
    if (hint) {
      const platform = navigator.userAgentData?.platform ?? navigator.platform;
      hint.textContent = /mac/i.test(platform) ? '⌘K' : 'Ctrl+K';
    }
  });

  onDestroy(() => {
    if (isOpen) {
      document.body.style.overflow = '';
      document.querySelector('main')?.removeAttribute('inert');
      document.querySelector('footer')?.removeAttribute('inert');
    }
  });

  async function openDrawer() {
    isOpen = true;
    document.body.style.overflow = 'hidden';
    document.querySelector('main')?.setAttribute('inert', '');
    document.querySelector('footer')?.setAttribute('inert', '');
    await tick();
    closeBtn?.focus();
  }

  async function closeDrawer() {
    isOpen = false;
    document.body.style.overflow = '';
    document.querySelector('main')?.removeAttribute('inert');
    document.querySelector('footer')?.removeAttribute('inert');
    await tick();
    hamburgerBtn?.focus();
  }

  function toggleDrawer() {
    if (isOpen) closeDrawer();
    else openDrawer();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key === 'Tab') trapFocus(e);
  }

  function trapFocus(e: KeyboardEvent) {
    if (!drawerEl) return;
    const focusable = Array.from(
      drawerEl.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function handleNavClick() {
    closeDrawer();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<header>
  <nav>
    <div id="nav" class="max-content nav-inner py-[0.6rem] px-4">
      <p class="m-0">
        <a href="/" class="nav-tagline">bytes of thought by Daniel Tucker</a>
      </p>

      <!-- Desktop nav links (hidden on mobile via CSS) -->
      <div class="nav-links flex gap-6 flex-wrap justify-center items-center">
        {#if path.startsWith('/recipe')}
          <span class="nav-link" aria-current="page">Recipes</span>
        {:else}
          <a href="/recipe" class="nav-link">Recipes</a>
        {/if}
        {#if path.startsWith('/article')}
          <span class="nav-link" aria-current="page">Articles</span>
        {:else}
          <a href="/article" class="nav-link">Articles</a>
        {/if}
        {#if path.startsWith('/portfolio')}
          <span class="nav-link" aria-current="page">Portfolio</span>
        {:else}
          <a href="/portfolio" class="nav-link">Portfolio</a>
        {/if}
        {#if path.startsWith('/resume')}
          <span class="nav-link" aria-current="page">Resume</span>
        {:else}
          <a href="/resume" class="nav-link">Resume</a>
        {/if}
        {#if path.startsWith('/about')}
          <span class="nav-link" aria-current="page">About</span>
        {:else}
          <a href="/about" class="nav-link">About</a>
        {/if}
        <button
          class="search-btn"
          on:click={() => document.dispatchEvent(new CustomEvent('open-search'))}
          aria-label="Open search"
        >
          <svg class="search-icon" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="search-btn-label">Quick search…</span>
          <kbd class="search-btn-hint" aria-hidden="true" id="search-kbd-hint">⌘K</kbd>
        </button>
      </div>

      <!-- Mobile hamburger (hidden on desktop via CSS) -->
      <button
        bind:this={hamburgerBtn}
        class="hamburger"
        on:click={toggleDrawer}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-drawer"
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="currentColor" aria-hidden="true">
          <rect y="0" width="20" height="2" rx="1"/>
          <rect y="6" width="20" height="2" rx="1"/>
          <rect y="12" width="20" height="2" rx="1"/>
        </svg>
      </button>
    </div>
  </nav>

  {#if title}
    <h1 class="max-content text-center pb-4 text-primary">{title}</h1>
  {/if}

  <!-- Backdrop -->
  <div
    class="backdrop"
    class:open={isOpen}
    role="presentation"
    aria-hidden="true"
    on:click={closeDrawer}
  ></div>

  <!-- Drawer -->
  <div
    bind:this={drawerEl}
    id="mobile-drawer"
    class="drawer"
    class:open={isOpen}
    role="dialog"
    aria-modal="true"
    aria-label="Navigation menu"
    aria-hidden={!isOpen}
  >
    <div class="drawer-inner">
      <button
        bind:this={closeBtn}
        id="drawer-close"
        class="drawer-close"
        on:click={closeDrawer}
        aria-label="Close menu"
      >✕</button>
      <nav class="drawer-nav">
        {#if path.startsWith('/recipe')}
          <span class="drawer-link" aria-current="page">Recipes</span>
        {:else}
          <a href="/recipe" class="drawer-link" on:click={handleNavClick}>Recipes</a>
        {/if}
        {#if path.startsWith('/article')}
          <span class="drawer-link" aria-current="page">Articles</span>
        {:else}
          <a href="/article" class="drawer-link" on:click={handleNavClick}>Articles</a>
        {/if}
        {#if path.startsWith('/portfolio')}
          <span class="drawer-link" aria-current="page">Portfolio</span>
        {:else}
          <a href="/portfolio" class="drawer-link" on:click={handleNavClick}>Portfolio</a>
        {/if}
        {#if path.startsWith('/resume')}
          <span class="drawer-link" aria-current="page">Resume</span>
        {:else}
          <a href="/resume" class="drawer-link" on:click={handleNavClick}>Resume</a>
        {/if}
        {#if path.startsWith('/about')}
          <span class="drawer-link" aria-current="page">About</span>
        {:else}
          <a href="/about" class="drawer-link" on:click={handleNavClick}>About</a>
        {/if}
        <button
          class="drawer-search-btn"
          on:click={() => { handleNavClick(); document.dispatchEvent(new CustomEvent('open-search')); }}
          aria-label="Open search"
        >
          <svg class="search-icon" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Search
        </button>
      </nav>
    </div>
  </div>

  <Search />
</header>

<style>
  /* ── Fixed nav bar ─────────────────────────────────────────────── */
  nav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    background: rgba(45, 54, 66, 0.95);
    border-bottom: 1px solid rgba(255, 140, 0, 0.4);
    z-index: 10;
  }

  header {
    padding-top: 4.5rem;
    width: 100vw;
    display: flex;
    align-items: center;
    flex-direction: column;
  }

  @media (min-width: 600px) {
    header { padding-top: 5rem; }
  }

  /* ── Nav inner layout ──────────────────────────────────────────── */
  .nav-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  @media (max-width: 639px) {
    .nav-inner {
      flex-direction: row;
      justify-content: space-between;
      gap: 0;
    }

    .nav-links {
      display: none;
    }
  }

  /* ── Hamburger button ──────────────────────────────────────────── */
  .hamburger {
    display: none;
  }

  @media (max-width: 639px) {
    .hamburger {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 4px;
      transition: color 0.15s ease, background 0.15s ease;
    }

    .hamburger:hover {
      color: rgba(255, 255, 255, 0.95);
      background: rgba(255, 255, 255, 0.08);
    }

    .hamburger:focus-visible {
      outline: 2px solid rgba(255, 140, 0, 0.6);
      outline-offset: 2px;
    }
  }

  /* ── Desktop search button ─────────────────────────────────────── */
  .search-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    color: rgba(255, 255, 255, 0.4);
  }

  .search-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.55);
  }

  .search-btn:focus,
  .search-btn:active { outline: none; }

  .search-btn:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }

  .search-icon { flex-shrink: 0; color: inherit; }

  .search-btn-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.01em;
  }

  .search-btn-hint {
    font-size: 0.65rem;
    font-weight: 400;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.25);
    letter-spacing: 0.02em;
    margin-left: 0.25rem;
  }

  /* ── Backdrop ──────────────────────────────────────────────────── */
  .backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    z-index: 19;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }

  .backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  @media (max-width: 639px) {
    .backdrop { display: block; }
  }

  /* ── Drawer ────────────────────────────────────────────────────── */
  .drawer {
    display: none;
    position: fixed;
    top: 0;
    right: 0;
    width: min(75vw, 300px);
    height: 100%;
    z-index: 20;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    overflow-y: auto;
    background: rgba(30, 38, 48, 0.75);
    backdrop-filter: blur(24px) saturate(180%);
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
  }

  @supports not (backdrop-filter: blur(1px)) {
    .drawer { background: rgba(30, 38, 48, 0.97); }
  }

  .drawer.open { transform: translateX(0); }

  @media (max-width: 639px) {
    .drawer { display: block; }
  }

  /* ── Drawer contents ───────────────────────────────────────────── */
  .drawer-inner {
    position: relative;
    padding: 3.5rem 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .drawer-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    line-height: 1;
    font-family: inherit;
    transition: color 0.15s ease;
  }

  .drawer-close:hover { color: rgba(255, 255, 255, 0.9); }

  .drawer-close:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }

  .drawer-nav {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .drawer-link {
    display: block;
    padding: 0.65rem 0.5rem;
    color: rgba(255, 255, 255, 0.75);
    text-decoration: none;
    font-size: 1rem;
    border-radius: 6px;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .drawer-link:hover {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.07);
  }

  .drawer-link[aria-current="page"] { color: rgb(255, 140, 0); }

  .drawer-search-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.5rem;
    margin-top: 0.75rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.9rem;
    width: 100%;
    text-align: left;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .drawer-search-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.75);
  }

  .drawer-search-btn:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }
</style>
