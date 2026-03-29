<script lang="ts">
  import { onMount } from 'svelte';
  import type { ArticleSummary } from '../lib/types';
  import ArticleCard from './ArticleCard.svelte';
  import { authHeaders, setAdminToken } from '../lib/auth';

  let articles: ArticleSummary[] = [];
  let loading = true;
  let error = '';
  let filter: 'all' | 'live' | 'draft' | 'scheduled' = 'all';

  let authNeeded = false;
  let tokenInput = '';

  async function loadArticles() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/admin/api/articles', { headers: authHeaders() });
      if (res.status === 401) { authNeeded = true; loading = false; return; }
      if (!res.ok) throw new Error(`${res.status}`);
      articles = await res.json();
    } catch (e) {
      error = `Failed to load articles: ${e}`;
    } finally {
      loading = false;
    }
  }

  onMount(loadArticles);

  function submitToken() {
    if (!tokenInput) return;
    setAdminToken(tokenInput);
    tokenInput = '';
    authNeeded = false;
    loadArticles();
  }

  $: filtered = filter === 'all' ? articles : articles.filter(a => a.status === filter);
  $: counts = {
    all: articles.length,
    live: articles.filter(a => a.status === 'live').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
  };
</script>

{#if authNeeded}
  <div class="auth-gate">
    <form class="auth-form" on:submit|preventDefault={submitToken}>
      <p class="auth-label">Admin token required</p>
      <input
        class="auth-input"
        type="password"
        bind:value={tokenInput}
        placeholder="Enter admin token"
        autocomplete="current-password"
      />
      <button type="submit" class="btn-primary">Unlock</button>
    </form>
  </div>
{:else}
<div class="admin-shell">
  <!-- Top bar -->
  <header class="topbar">
    <span class="brand">{import.meta.env.PUBLIC_SITE_NAME ?? 'Site'} — admin</span>
    <a href="/admin/new" class="btn-primary">+ New Article</a>
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
        {#each filtered as article (article.slug)}
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
{/if}

<style>
  .auth-gate {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--admin-bg);
  }
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 8px;
    padding: 32px;
    width: 300px;
  }
  .auth-label { font-size: 14px; color: var(--admin-text); font-weight: 600; margin: 0; }
  .auth-input { font-size: 14px; padding: 8px 10px; }

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

  .filters {
    display: flex;
    gap: 4px;
    padding: 12px 24px 0;
    border-bottom: 1px solid var(--admin-border);
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
