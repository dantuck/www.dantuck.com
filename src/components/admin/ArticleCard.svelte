<script lang="ts">
  import type { ArticleSummary } from '../../lib/admin/types';

  export let article: ArticleSummary;

  const STATUS_LABELS: Record<string, string> = {
    live: 'Live',
    draft: 'Draft',
    scheduled: 'Scheduled',
    building: 'Building...',
  };

  function formatDate(d?: string) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  }

  // CRITICAL: use query param, not path segment
  $: editUrl = `/admin/edit?slug=${encodeURIComponent(article.slug)}`;
</script>

<a
  href={editUrl}
  class="card"
  data-status={article.status}
>
  <div class="card-title">{article.title || 'Untitled'}</div>

  <div class="card-meta">
    <span class="badge status-{article.status}">{STATUS_LABELS[article.status] ?? article.status}</span>
    {#if article.publishDate}
      <span class="date">{formatDate(article.publishDate)}</span>
    {/if}
  </div>

  {#if article.previewUrl && article.status !== 'live'}
    <a
      href={article.previewUrl}
      target="_blank"
      rel="noopener"
      class="preview-link"
      on:click|stopPropagation
    >
      Preview ↗
    </a>
  {/if}
</a>

<style>
  .card {
    display: block;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 8px;
    padding: 16px;
    text-decoration: none;
    color: var(--admin-text);
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .card:hover { border-color: var(--admin-orange); background: var(--admin-surface-2); }

  .card[data-status="draft"]     { border-left: 3px solid var(--admin-orange); }
  .card[data-status="scheduled"] { border-left: 3px solid var(--admin-purple); }
  .card[data-status="live"]      { border-left: 3px solid var(--admin-green); }

  .card-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }

  .card-meta { display: flex; align-items: center; gap: 8px; }

  .badge {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--admin-surface-2);
  }
  .status-live      { color: var(--admin-green); }
  .status-draft     { color: var(--admin-orange); }
  .status-scheduled { color: var(--admin-purple); }

  .date { font-size: 12px; color: var(--admin-text-muted); }

  .preview-link {
    display: inline-block;
    margin-top: 8px;
    font-size: 12px;
    color: var(--admin-purple);
    text-decoration: none;
  }
  .preview-link:hover { text-decoration: underline; }
</style>
