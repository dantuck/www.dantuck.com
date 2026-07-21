<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import Search from './Search.svelte';
  import ThemeToggle from './ThemeToggle.svelte';

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

<a href="#main-content" class="skip-link">Skip to content</a>

<header>
  <nav class="site-nav">
    <div id="nav" class="max-content nav-inner py-[0.6rem] px-4">
      <p class="m-0 brand">
        <a href="/" class="brand-link"><span class="brand-bar" aria-hidden="true"></span>bytes of thought<span class="nav-tagline-sub"> by Daniel Tucker</span></a>
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
        <ThemeToggle />
      </div>
    </div>

    <!-- Mobile hamburger (hidden on desktop via CSS) — sits outside the
         centered max-content column so it can sit flush against the edge -->
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
  </nav>

  {#if title}
    <h1 class="max-content page-title m-0 text-center pb-4 text-primary">{title}</h1>
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
        <div class="drawer-theme-toggle"><ThemeToggle /></div>
      </div>
    </div>
  </div>

  {#if mounted}<Search />{/if}
</header>

<style>
  /* ── Fixed nav bar ─────────────────────────────────────────────── */
  .site-nav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    background: color-mix(in srgb, var(--color-bg) 95%, transparent);
    border-bottom: 1px solid var(--color-border);
    z-index: 10;
  }

  .brand {
    display: flex;
    line-height: 1;
  }

  .brand-link {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .brand-link:hover {
    color: var(--color-accent-text);
  }

  .brand-bar {
    display: inline-block;
    width: 2px;
    height: 1rem;
    background: var(--color-accent);
  }

  header {
    padding-top: 2.75rem;
    width: 100vw;
    display: flex;
    align-items: center;
    flex-direction: column;
  }

  @media (min-width: 600px) {
    header { padding-top: 5rem; }
  }

  @media (max-width: 639px) {
    .page-title {
      width: min(800px, calc(100vw - 3rem));
      text-align: left;
    }
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
      justify-content: flex-start;
      align-items: center;
      gap: 0;
      padding-right: 3.25rem;
    }

    .nav-links {
      display: none;
    }

    .nav-tagline-sub {
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
      position: absolute;
      top: 50%;
      right: 1rem;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--color-text);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 4px;
      transition: color 0.15s ease, background 0.15s ease;
    }

    @media (hover: hover) {
      .hamburger:hover {
        color: var(--color-heading);
        background: var(--color-border);
      }
    }

    .hamburger:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
      outline-offset: 2px;
    }
  }

  /* ── Desktop search button ─────────────────────────────────────── */
  .search-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    color: var(--color-text-muted);
  }

  .search-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .search-btn:focus,
  .search-btn:active { outline: none; }

  .search-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
    outline-offset: 2px;
  }

  .search-icon { flex-shrink: 0; color: inherit; }

  .search-btn-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    letter-spacing: 0.01em;
  }

  .search-btn-hint {
    font-size: 0.65rem;
    font-weight: 400;
    font-family: inherit;
    color: var(--color-text-muted);
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
    background: color-mix(in srgb, var(--color-bg-raised) 85%, transparent);
    backdrop-filter: blur(24px) saturate(180%);
    border-left: 1px solid var(--color-border);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.25);
  }

  @supports not (backdrop-filter: blur(1px)) {
    .drawer { background: var(--color-bg-raised); }
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
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    color: var(--color-text);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    font-family: inherit;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  @media (hover: hover) {
    .drawer-close:hover {
      color: var(--color-accent-text);
      border-color: var(--color-accent);
    }
  }

  .drawer-close:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
    outline-offset: 2px;
  }

  .drawer-nav {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    padding: 0.5rem 0.75rem;
    gap: 0.25rem;
  }

  .drawer-link {
    display: block;
    padding: 0.85rem 1rem;
    color: var(--color-text);
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
      background: var(--color-border);
      color: var(--color-heading);
    }
  }

  .drawer-link[aria-current="page"] {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent-text);
    cursor: default;
  }

  .drawer-footer {
    margin-top: auto;
    border-top: 1px solid var(--color-border);
    padding: 0.5rem 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .drawer-link-search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: none;
    border: none;
    border-radius: 10px;
    flex: 1;
    text-align: left;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    font-family: Comfortaa, sans-serif;
    font-weight: 600;
    padding: 0.85rem 1rem;
    cursor: pointer;
  }

  @media (hover: hover) {
    .drawer-link-search:hover {
      background: var(--color-border);
      color: var(--color-text);
    }
  }

  .drawer-link-search:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
    outline-offset: 2px;
  }
</style>
