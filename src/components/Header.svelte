<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import Search from './Search.svelte';

  export let title: string | undefined = undefined;
  export let path: string = '';

  // Read directly from the browser URL synchronously — avoids relying on
  // the SSR prop being correct after a View Transitions client-side navigation.
  let currentPath = typeof window !== 'undefined' ? window.location.pathname : path;
  let mounted = false;
  let isOpen = false;
  let isSearchMode = false;
  let hamburgerBtn: HTMLButtonElement;
  let closeBtn: HTMLButtonElement;
  let drawerEl: HTMLElement | undefined;

  function handleOpenSearch() {
    if (window.innerWidth < 640) {
      isSearchMode = true;
      if (!isOpen) openDrawer();
    }
  }

  function handleCloseSearch() {
    if (isSearchMode) {
      isSearchMode = false;
      if (isOpen) closeDrawer();
    }
  }

  function updatePath() {
    currentPath = window.location.pathname;
  }

  onMount(() => {
    mounted = true;
    const hint = document.getElementById('search-kbd-hint');
    if (hint) {
      const platform = navigator.userAgentData?.platform ?? navigator.platform;
      hint.textContent = /mac/i.test(platform) ? '⌘K' : 'Ctrl+K';
    }
    document.addEventListener('open-search', handleOpenSearch);
    document.addEventListener('close-search', handleCloseSearch);
    document.addEventListener('astro:after-swap', updatePath);
  });

  onDestroy(() => {
    if (!mounted) return; // onMount never ran in SSR; no listeners to clean up
    if (isOpen) {
      document.body.style.overflow = '';
      document.querySelector('main')?.removeAttribute('inert');
      document.querySelector('footer')?.removeAttribute('inert');
    }
    document.removeEventListener('open-search', handleOpenSearch);
    document.removeEventListener('close-search', handleCloseSearch);
    document.removeEventListener('astro:after-swap', updatePath);
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

  const navItems = [
    { href: '/recipe',    label: 'Recipes'   },
    { href: '/article',   label: 'Articles'  },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/about',     label: 'About'     },
  ];

  function isActive(href: string): boolean {
    return currentPath === href || currentPath.startsWith(href + '/');
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<header>
  <nav>
    <div id="nav" class="max-content nav-inner py-[0.6rem] px-4">
      <p class="m-0">
        <a href="/" class="nav-tagline">bytes of thought<span class="nav-tagline-sub"> by Daniel Tucker</span></a>
      </p>

      <!-- Desktop nav links (hidden on mobile via CSS) -->
      <div class="nav-links flex gap-6 flex-wrap justify-center items-center">
        {#each navItems as item}
          {#if currentPath === item.href}
            <span class="nav-link" aria-current="page">{item.label}</span>
          {:else}
            <a href={item.href} class="nav-link" aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</a>
          {/if}
        {/each}
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
    class:search-mode={isSearchMode}
    role="dialog"
    aria-modal="true"
    aria-label="Navigation menu"
    aria-hidden={!isOpen}
  >
    <div class="drawer-inner">
      <div class="drawer-top">
        <button
          bind:this={closeBtn}
          id="drawer-close"
          class="drawer-close"
          on:click={closeDrawer}
          aria-label="Close menu"
        >✕</button>
      </div>
      <nav class="drawer-nav">
        {#each navItems as item}
          {#if currentPath === item.href}
            <span class="drawer-link" aria-current="page">{item.label}</span>
          {:else}
            <a href={item.href} class="drawer-link" aria-current={isActive(item.href) ? 'page' : undefined} on:click={handleNavClick}>{item.label}</a>
          {/if}
        {/each}
      </nav>
      <div class="drawer-footer">
        <button
          class="drawer-link-search"
          on:click={() => document.dispatchEvent(new CustomEvent('open-search'))}
          aria-label="Open search"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Search
        </button>
      </div>
    </div>
  </div>

  {#if mounted}<Search />{/if}
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

    .nav-tagline-sub {
      display: block;
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

    @media (hover: hover) {
      .hamburger:hover {
        color: rgba(255, 255, 255, 0.95);
        background: rgba(255, 255, 255, 0.08);
      }
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
    height: 100dvh;
    z-index: 20;
    transform: translateX(100%);
    transition: transform 0.25s ease, width 0.2s ease;
    overflow-y: auto;
    overflow-x: hidden;
    background: rgba(30, 38, 48, 0.75);
    backdrop-filter: blur(24px) saturate(180%);
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
  }

  @supports not (backdrop-filter: blur(1px)) {
    .drawer { background: rgba(30, 38, 48, 0.97); }
  }

  .drawer.open { transform: translateX(0); }

  /* Search mode: expand full-width and sit above the search backdrop (z-index 40)
     so the frosted glass drawer is the visual context for the search modal */
  .drawer.search-mode {
    left: 0;
    right: 0;
    width: auto;
    z-index: 45;
    border-left: none;
  }

  .drawer.search-mode .drawer-top,
  .drawer.search-mode .drawer-nav {
    visibility: hidden;
    pointer-events: none;
  }

  @media (max-width: 639px) {
    .drawer { display: block; }
  }

  /* ── Drawer contents ───────────────────────────────────────────── */
  .drawer-inner {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }

  .drawer-top {
    display: flex;
    justify-content: flex-end;
    padding: 1rem 1rem 0.5rem;
  }

  .drawer-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    line-height: 1;
    font-family: inherit;
    transition: color 0.15s ease, background 0.15s ease;
  }

  @media (hover: hover) {
    .drawer-close:hover {
      color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.08);
    }
  }

  .drawer-close:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }

  .drawer-nav {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.75rem;
    gap: 0.25rem;
  }

  .drawer-link {
    display: block;
    padding: 0.85rem 1rem;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: 600;
    font-family: Comfortaa, sans-serif;
    border-radius: 10px;
    transition: background 0.15s ease, color 0.15s ease;
    user-select: none;
  }

  @media (hover: hover) {
    .drawer-link:hover {
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 1);
    }
  }

  .drawer-link[aria-current="page"] {
    background: rgba(255, 140, 0, 0.15);
    color: rgb(255, 140, 0);
    cursor: default;
  }

  .drawer-footer {
    margin-top: auto;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    padding: 0.5rem 0.75rem 1.5rem;
  }

  .drawer-link-search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: none;
    border: none;
    border-radius: 10px;
    width: 100%;
    text-align: left;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.95rem;
    font-family: Comfortaa, sans-serif;
    font-weight: 600;
    padding: 0.85rem 1rem;
    cursor: pointer;
  }

  @media (hover: hover) {
    .drawer-link-search:hover {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.7);
    }
  }

  .drawer-link-search:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }
</style>
