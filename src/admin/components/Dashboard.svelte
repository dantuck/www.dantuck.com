<script lang="ts">
  import { onMount } from 'svelte';
  import type { ArticleSummary } from '../lib/types';
  import ArticleCard from './ArticleCard.svelte';

  const TYPES = ['article', 'recipe', 'portfolio'] as const;
  const TYPE_LABELS: Record<string, string> = { article: 'Article', recipe: 'Recipe', portfolio: 'Portfolio project' };

  let articles: ArticleSummary[] = [];
  let loading = true;
  let error = '';
  let filter: 'all' | 'live' | 'draft' | 'scheduled' = 'all';
  let typeFilter: 'all' | typeof TYPES[number] = 'all';
  let newMenuOpen = false;

  async function loadArticles() {
    loading = true;
    error = '';
    try {
      const responses = await Promise.all(TYPES.map(t => fetch(`/admin/api/articles?type=${t}`)));
      if (responses.some(r => !r.ok)) throw new Error(responses.find(r => !r.ok)?.status.toString());
      const lists = await Promise.all(responses.map(r => r.json() as Promise<ArticleSummary[]>));
      articles = lists.flat();
    } catch (e) {
      error = `Failed to load articles: ${e}`;
    } finally {
      loading = false;
    }
  }

  onMount(loadArticles);

  $: filtered = articles
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => typeFilter === 'all' || a.type === typeFilter);
  $: counts = {
    all: articles.length,
    live: articles.filter(a => a.status === 'live').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
  };
</script>

<div class="admin-shell">
  <!-- Top bar -->
  <header class="topbar">
    <span class="brand">{import.meta.env.PUBLIC_SITE_NAME ?? 'Site'} — admin</span>
    <a href="/admin/data/resume" class="btn-ghost">Resume</a>
    <a href="/admin/data/about" class="btn-ghost">About</a>
    <div class="new-menu-wrap">
      <button class="btn-primary" on:click={() => newMenuOpen = !newMenuOpen}>+ New ▾</button>
      {#if newMenuOpen}
        <div class="dropdown-backdrop" role="presentation" on:click={() => newMenuOpen = false}></div>
        <div class="new-dropdown">
          {#each TYPES as t}
            <a href={`/admin/new?type=${t}`} class="new-dropdown-item">{TYPE_LABELS[t]}</a>
          {/each}
        </div>
      {/if}
    </div>
  </header>

  <!-- Filter tabs -->
  <nav class="filters">
    {#each (['all', 'live', 'draft', 'scheduled'] as const) as f}
      <button
        class="filter-tab"
        class:active={filter === f}
        on:click={() => filter = f}
      >
        {f.charAt(0).toUpperCase() + f.slice(1)}
        <span class="count">{counts[f]}</span>
      </button>
    {/each}
    <span class="filter-divider"></span>
    {#each (['all', ...TYPES] as const) as t}
      <button
        class="filter-tab"
        class:active={typeFilter === t}
        on:click={() => typeFilter = t}
      >
        {t === 'all' ? 'All types' : TYPE_LABELS[t]}
      </button>
    {/each}
  </nav>

  <!-- Content -->
  <main class="grid-area">
    {#if loading}
      <p class="state-msg">Loading articles...</p>
    {:else if error}
      <p class="state-msg error">{error}</p>
    {:else if filtered.length === 0}
      <p class="state-msg">No articles in this view.</p>
    {:else}
      <div class="card-grid">
        {#each filtered as article (article.slug + article.type)}
          <ArticleCard {article} />
        {/each}
        <a href="/admin/new" class="card card-new">
          <span class="plus">+</span>
          <span>New article</span>
        </a>
      </div>
    {/if}
  </main>
</div>

<style>
  .admin-shell { display: flex; flex-direction: column; min-height: 100vh; }

  .topbar {
    display: flex;
    align-items: center;
    padding: 12px 24px;
    background: var(--admin-surface);
    border-bottom: 1px solid var(--admin-border);
    gap: 16px;
  }
  .brand { font-weight: 700; font-size: 14px; color: var(--admin-orange); flex: 1; }

  .new-menu-wrap { position: relative; }
  .dropdown-backdrop { position: fixed; inset: 0; z-index: 10; }
  .new-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--admin-surface-2);
    border: 1px solid var(--admin-border);
    border-radius: 6px;
    min-width: 180px;
    z-index: 11;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    overflow: hidden;
  }
  .new-dropdown-item {
    display: block;
    padding: 10px 14px;
    color: var(--admin-text);
    text-decoration: none;
    font-size: 13px;
    border-bottom: 1px solid var(--admin-border);
  }
  .new-dropdown-item:last-child { border-bottom: none; }
  .new-dropdown-item:hover { background: var(--admin-surface); text-decoration: none; }

  .filters {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 24px 0;
    border-bottom: 1px solid var(--admin-border);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .filter-divider {
    width: 1px;
    height: 16px;
    background: var(--admin-border);
    margin: 0 8px;
    flex-shrink: 0;
  }
  .filter-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 8px 12px;
    color: var(--admin-text-muted);
    font-size: 13px;
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: -1px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .filter-tab.active { color: var(--admin-orange); border-bottom-color: var(--admin-orange); }
  .filter-tab:hover { color: var(--admin-text); }
  .count {
    background: var(--admin-surface-2);
    border-radius: 10px;
    padding: 1px 7px;
    font-size: 11px;
  }

  .grid-area { padding: 24px; flex: 1; }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .card-new {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px dashed var(--admin-border);
    color: var(--admin-text-muted);
    text-decoration: none;
    background: transparent;
    min-height: 100px;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.15s, color 0.15s;
  }
  .card-new:hover { border-color: var(--admin-orange); color: var(--admin-orange); }
  .plus { font-size: 24px; line-height: 1; }

  .state-msg { color: var(--admin-text-muted); font-size: 14px; }
  .state-msg.error { color: var(--admin-red); }
</style>
