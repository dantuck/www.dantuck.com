<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';

  type SearchResult = {
    url: string;
    meta: { title: string; tags?: string };
    excerpt: string;
  };

  let open = false;
  let query = '';
  let results: SearchResult[] = [];
  let selectedIndex = 0;
  let devMode = false;
  let inputEl: HTMLInputElement | undefined;
  let modalEl: HTMLElement | undefined;
  let triggerEl: HTMLElement | null = null;
  let searchId = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pagefind: any;
  let pagefindLoaded = false;

  async function loadPagefind() {
    if (pagefindLoaded || devMode) return;
    if (!import.meta.env.PROD) {
      devMode = true;
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — generated post-build, not present at compile time
      pagefind = await import(/* @vite-ignore */ '/pagefind/pagefind.js');
      pagefindLoaded = true;
    } catch {
      devMode = true;
    }
  }

  async function openModal(trigger: HTMLElement | null = null) {
    triggerEl = trigger ?? (document.activeElement as HTMLElement | null);
    open = true;
    await tick();
    inputEl?.focus();
    await loadPagefind();
  }

  function closeModal() {
    open = false;
    query = '';
    results = [];
    selectedIndex = 0;
    triggerEl?.focus();
    triggerEl = null;
  }

  async function runSearch(q: string) {
    const id = ++searchId;
    if (!pagefindLoaded || devMode || !q.trim()) {
      results = [];
      return;
    }
    const res = await pagefind.search(q);
    if (id !== searchId) return;
    const raw = await Promise.all(res.results.slice(0, 12).map((r: any) => r.data()));
    if (id !== searchId) return;
    results = raw;
    selectedIndex = 0;
  }

  $: runSearch(query);

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (open) closeModal();
      else openModal();
    }
  }

  function handleModalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeModal();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      window.location.href = results[selectedIndex].url;
    } else if (e.key === 'Tab') {
      const focusable = modalEl?.querySelectorAll<HTMLElement>('input, button');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function handleOpenSearch() {
    openModal();
  }

  function typeLabel(url: string): string {
    return url.includes('/recipe/') ? 'Recipe' : 'Article';
  }

  function dotClass(url: string): string {
    return url.includes('/recipe/') ? 'dot-recipe' : 'dot-article';
  }

  onMount(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    document.addEventListener('open-search', handleOpenSearch);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleGlobalKeydown);
    document.removeEventListener('open-search', handleOpenSearch);
  });
</script>

{#if open}
  <div class="backdrop" on:click={closeModal} aria-hidden="true"></div>
  <div
    bind:this={modalEl}
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label="Search"
    tabindex="-1"
    on:keydown={handleModalKeydown}
  >
    <div class="modal-input-row">
      <span class="search-icon" aria-hidden="true">⌕</span>
      <input
        bind:this={inputEl}
        bind:value={query}
        type="text"
        placeholder="Search articles and recipes…"
        aria-label="Search"
        autocomplete="off"
        spellcheck="false"
      />
      <button class="esc-btn" on:click={closeModal} aria-label="Close search">esc</button>
    </div>

    <div aria-live="polite" class="sr-only">
      {#if results.length > 0}{results.length} result{results.length === 1 ? '' : 's'}{/if}
    </div>

    {#if devMode}
      <div class="state-msg">Search is only available in production builds.</div>
    {:else if !query.trim()}
      <div class="state-msg">Search articles and recipes…</div>
    {:else if results.length === 0}
      <div class="state-msg">No results for '{query}'</div>
    {:else}
      <div class="modal-body">
        <ul class="result-list" role="listbox" aria-label="Search results">
          {#each results as result, i}
            <li
              class="result-item"
              class:active={i === selectedIndex}
              role="option"
              aria-selected={i === selectedIndex}
              on:mouseenter={() => (selectedIndex = i)}
              on:click={() => (window.location.href = result.url)}
              on:keydown={(e) => { if (e.key === 'Enter') window.location.href = result.url; }}
            >
              <span class="dot {dotClass(result.url)}" aria-hidden="true"></span>
              <span class="result-title">{result.meta.title}</span>
            </li>
          {/each}
        </ul>
        <div class="preview-panel" aria-hidden="true">
          {#if results[selectedIndex]}
            {@const r = results[selectedIndex]}
            <div class="preview-type">{typeLabel(r.url)}</div>
            <div class="preview-title">{r.meta.title}</div>
            <!-- Safe: Pagefind excerpt contains only <mark> highlight tags, no user-supplied HTML -->
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <div class="preview-excerpt">{@html r.excerpt}</div>
            {#if r.meta.tags}
              <div class="preview-tags">{r.meta.tags}</div>
            {/if}
          {/if}
        </div>
      </div>
    {/if}

    <div class="modal-footer" aria-hidden="true">
      <span><kbd>↑↓</kbd> navigate</span>
      <span><kbd>↵</kbd> open</span>
      <span><kbd>esc</kbd> close</span>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 40;
  }

  .modal {
    position: fixed;
    top: 10vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(640px, calc(100vw - 2rem));
    background: #1a2230;
    border-radius: 10px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 80vh;
  }

  .modal-input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
  }

  .search-icon {
    color: rgba(255, 140, 0, 0.6);
    font-size: 1rem;
  }

  .modal-input-row input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #eee;
    font-size: 1rem;
    font-family: inherit;
  }

  .modal-input-row input::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  .esc-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    cursor: pointer;
    font-family: inherit;
  }

  .esc-btn:hover {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .state-msg {
    padding: 2rem 1.25rem;
    color: rgba(170, 170, 170, 0.5);
    font-size: 0.85rem;
    text-align: center;
  }

  .modal-body {
    display: flex;
    flex: 1;
    min-height: 0;
    height: 280px;
  }

  .result-list {
    width: 45%;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    overflow-y: auto;
    padding: 0.4rem 0;
    margin: 0;
    list-style: none;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
    user-select: none;
  }

  .result-item.active {
    background: rgba(255, 140, 0, 0.1);
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-article {
    background: rgb(255, 140, 0);
  }

  .dot-recipe {
    background: rgb(100, 200, 150);
  }

  .result-title {
    font-size: 0.8rem;
    color: rgb(220, 220, 220);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview-panel {
    flex: 1;
    padding: 1.25rem;
    overflow-y: auto;
  }

  .preview-type {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgb(255, 140, 0);
    margin-bottom: 0.4rem;
  }

  .preview-title {
    font-size: 0.95rem;
    color: rgb(241, 241, 241);
    margin-bottom: 0.6rem;
    line-height: 1.3;
    font-weight: 600;
  }

  .preview-excerpt {
    font-size: 0.78rem;
    color: rgba(170, 170, 170, 0.8);
    line-height: 1.6;
  }

  /* Style Pagefind <mark> highlights inside excerpt */
  .preview-excerpt :global(mark) {
    background: rgba(255, 140, 0, 0.25);
    color: rgb(255, 180, 60);
    border-radius: 2px;
    padding: 0 0.1em;
  }

  .preview-tags {
    margin-top: 0.75rem;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .modal-footer span {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  kbd {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    padding: 0.05rem 0.3rem;
    font-size: 0.6rem;
    font-family: inherit;
    color: inherit;
    background: none;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Mobile: full-width, hide preview panel */
  @media (max-width: 639px) {
    .modal {
      top: 0;
      left: 0;
      transform: none;
      width: 100%;
      border-radius: 0 0 10px 10px;
      max-height: 90vh;
    }

    .preview-panel {
      display: none;
    }

    .result-list {
      width: 100%;
      border-right: none;
    }
  }
</style>
