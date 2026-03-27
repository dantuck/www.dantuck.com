<script lang="ts">
  import { onDestroy } from 'svelte';

  export let prNumber: number | undefined = undefined;
  export let title = 'Untitled';
  export let publishDate: string | undefined = undefined;
  export let slug: string | undefined = undefined;
  export let path: string | undefined = undefined;
  export let branch: string | undefined = undefined;
  export let onSave: () => Promise<void>;

  type DeployStatus = 'idle' | 'publishing' | 'building' | 'live' | 'error';
  let status: DeployStatus = 'idle';
  let dropdownOpen = false;
  let scheduleDateInput = publishDate ?? '';
  let pollInterval: ReturnType<typeof setInterval>;

  async function publishNow() {
    if (!prNumber) {
      // Save first to create the PR
      await onSave();
      if (!prNumber) return;
    }
    status = 'publishing';
    dropdownOpen = false;
    try {
      const res = await fetch('/admin/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber, title }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      status = 'building';
      startPolling();
    } catch {
      status = 'error';
    }
  }

  async function schedule() {
    if (!scheduleDateInput) return;
    if (!prNumber) {
      await onSave();
      if (!prNumber) return;
    }
    dropdownOpen = false;
    try {
      await fetch('/admin/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber, slug, path, branch, publishDate: scheduleDateInput }),
      });
    } catch { /* ignore */ }
  }

  function startPolling() {
    const started = Date.now();
    const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes

    pollInterval = setInterval(async () => {
      if (Date.now() - started > MAX_POLL_MS) {
        status = 'error';
        clearInterval(pollInterval);
        return;
      }
      try {
        const res = await fetch('/admin/api/status');
        const data = await res.json();
        if (data.status === 'live') {
          status = 'live';
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          status = 'error';
          clearInterval(pollInterval);
        }
      } catch { /* keep polling */ }
    }, 5000);
  }

  onDestroy(() => clearInterval(pollInterval));
</script>

{#if status === 'building'}
  <div class="building-indicator">
    <span class="pulse"></span>
    Building on Cloudflare...
  </div>
{:else if status === 'live'}
  <div class="live-indicator">
    <span class="dot-green"></span>
    Live ✓
  </div>
{:else if status === 'error'}
  <button class="btn-primary" style="background: var(--admin-red)" on:click={() => status = 'idle'}>
    Failed — Retry
  </button>
{:else if status === 'publishing'}
  <div class="building-indicator">
    <span class="pulse"></span>
    Publishing...
  </div>
{:else}
  <div class="split-btn-wrapper">
    <button class="split-primary" on:click={publishNow}>
      {prNumber ? 'Publish Now' : 'Save & Publish'}
    </button>
    <button class="split-chevron" on:click={() => dropdownOpen = !dropdownOpen} aria-label="More options">
      ▾
    </button>

    {#if dropdownOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="dropdown-backdrop" on:click={() => dropdownOpen = false}></div>
      <div class="dropdown">
        <button class="dropdown-item" on:click={publishNow}>
          <strong>Publish Now</strong>
          <span>Merge PR → goes live in ~1 min</span>
        </button>
        <div class="dropdown-item schedule-item">
          <strong>Schedule</strong>
          <div class="schedule-row">
            <input
              bind:value={scheduleDateInput}
              placeholder="27 Apr 2026 14:00 UTC"
              style="flex: 1"
            />
            <button class="btn-primary" style="padding: 4px 10px; font-size: 13px" on:click={schedule}>
              Set
            </button>
          </div>
        </div>
        <button class="dropdown-item" on:click={() => { onSave(); dropdownOpen = false; }}>
          <strong>Save Draft</strong>
          <span>Push to branch, keep PR open</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .split-btn-wrapper { position: relative; display: flex; }

  .split-primary {
    background: var(--admin-orange);
    color: #fff;
    font-weight: 600;
    border-radius: 5px 0 0 5px;
    padding: 6px 14px;
    border: none;
    cursor: pointer;
  }
  .split-primary:hover { background: var(--admin-orange-hover); }

  .split-chevron {
    background: #ea6c0f;
    color: #fff;
    border-radius: 0 5px 5px 0;
    border: none;
    border-left: 1px solid rgba(255,255,255,0.2);
    padding: 6px 10px;
    cursor: pointer;
    font-size: 12px;
  }
  .split-chevron:hover { background: #d96200; }

  .dropdown-backdrop {
    position: fixed; inset: 0; z-index: 10;
  }
  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--admin-surface-2);
    border: 1px solid var(--admin-border);
    border-radius: 6px;
    min-width: 220px;
    z-index: 11;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  .dropdown-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    border: none;
    border-bottom: 1px solid var(--admin-border);
    background: transparent;
    color: var(--admin-text);
    text-align: left;
    cursor: pointer;
    width: 100%;
    font-size: 13px;
  }
  .dropdown-item:last-child { border-bottom: none; }
  .dropdown-item:hover { background: var(--admin-surface); }
  .dropdown-item strong { font-weight: 600; }
  .dropdown-item span { font-size: 11px; color: var(--admin-text-muted); }

  .schedule-item { cursor: default; }
  .schedule-item:hover { background: transparent; }
  .schedule-row { display: flex; gap: 6px; margin-top: 6px; align-items: center; }

  .building-indicator, .live-indicator {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--admin-text-muted);
    padding: 6px 12px;
  }

  .pulse {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--admin-orange);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  .dot-green {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--admin-green);
  }
</style>
