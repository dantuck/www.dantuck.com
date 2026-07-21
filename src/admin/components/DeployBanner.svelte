<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { getDeployRecord, setDeployRecord, type DeployRecord } from '../lib/deployStatus';

  let record: DeployRecord | null = null;
  let pollInterval: ReturnType<typeof setInterval>;

  const MAX_POLL_MS = 10 * 60 * 1000;

  function startPolling() {
    clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (!record) { clearInterval(pollInterval); return; }
      if (Date.now() - record.startedAt > MAX_POLL_MS) {
        record = { ...record, status: 'failed', resolvedAt: Date.now() };
        setDeployRecord(record);
        clearInterval(pollInterval);
        return;
      }
      try {
        const res = await fetch('/admin/api/status');
        const data = await res.json();
        if (data.status === 'live' || data.status === 'failed') {
          record = { ...record, status: data.status, resolvedAt: Date.now() };
          setDeployRecord(record);
          clearInterval(pollInterval);
        }
      } catch { /* keep polling */ }
    }, 5000);
  }

  function dismiss() {
    record = null;
    setDeployRecord(null);
  }

  onMount(() => {
    record = getDeployRecord();
    if (record?.status === 'building') startPolling();
  });

  onDestroy(() => clearInterval(pollInterval));
</script>

{#if record}
  <div class="deploy-banner" class:building={record.status === 'building'} class:live={record.status === 'live'} class:failed={record.status === 'failed'}>
    <span class="dot" class:pulse={record.status === 'building'}></span>
    <span class="label">
      {#if record.status === 'building'}
        Building "{record.title}" on Cloudflare...
      {:else if record.status === 'live'}
        "{record.title}" is live ✓
      {:else}
        "{record.title}" failed to deploy
      {/if}
    </span>
    <button class="dismiss" on:click={dismiss} aria-label="Dismiss">✕</button>
  </div>
{/if}

<style>
  .deploy-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    font-size: 13px;
    background: var(--admin-surface-2);
    border-bottom: 1px solid var(--admin-border);
  }
  .building { color: var(--admin-orange); }
  .live { color: var(--admin-green); }
  .failed { color: var(--admin-red); }

  .dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
  .pulse { animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  .label { flex: 1; color: var(--admin-text); }
  .building .label, .live .label, .failed .label { color: inherit; }

  .dismiss {
    background: transparent;
    color: var(--admin-text-muted);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .dismiss:hover { color: var(--admin-text); background: var(--admin-surface); }
</style>
