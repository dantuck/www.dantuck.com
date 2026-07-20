<script lang="ts">
  import { onMount } from 'svelte';

  let theme: 'light' | 'dark' = 'light';

  onMount(() => {
    theme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light';
  });

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
</script>

<button
  class="theme-toggle"
  on:click={toggle}
  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
>
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
  </svg>
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-text);
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .theme-toggle:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }
</style>
