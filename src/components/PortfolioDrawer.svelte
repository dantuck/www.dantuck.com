<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Project = {
    title: string;
    tagline: string;
    url: string;
    screenshot: string;
    techStack: string[];
    role: string;
    bodyHtml: string;
  };

  let open = false;
  let project: Project | null = null;
  let drawerEl: HTMLElement;
  let lastFocusedCard: HTMLElement | null = null;

  function openDrawer(detail: Project, triggerEl: HTMLElement | null) {
    project = detail;
    lastFocusedCard = triggerEl;
    open = true;
    // Move focus into drawer after DOM update
    setTimeout(() => drawerEl?.focus(), 50);
  }

  function closeDrawer() {
    open = false;
    lastFocusedCard?.focus();
    lastFocusedCard = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (open && e.key === 'Escape') closeDrawer();
  }

  function handleEvent(e: Event) {
    const customEvent = e as CustomEvent<Project>;
    const trigger = document.activeElement as HTMLElement | null;
    openDrawer(customEvent.detail, trigger);
  }

  onMount(() => {
    document.addEventListener('open-portfolio-drawer', handleEvent);
  });

  onDestroy(() => {
    document.removeEventListener('open-portfolio-drawer', handleEvent);
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="backdrop"
    aria-hidden="true"
    on:click={closeDrawer}
  ></div>
{/if}

<!-- Drawer panel — always in DOM, translated off-screen when closed -->
<aside
  bind:this={drawerEl}
  class="drawer"
  class:open
  role="dialog"
  aria-modal="true"
  aria-label={project?.title ?? 'Project details'}
  tabindex="-1"
>
  {#if project}
    <div class="drawer-inner">
      <div class="drawer-header">
        <strong class="drawer-title">{project.title}</strong>
        <button class="close-btn" on:click={closeDrawer} aria-label="Close">✕</button>
      </div>

      <img
        src={project.screenshot}
        alt={`Screenshot of ${project.title}`}
        class="drawer-screenshot"
      />

      <a href={project.url} target="_blank" rel="noopener noreferrer" class="drawer-link">
        ↗ {project.url.replace(/^https?:\/\//, '')}
      </a>

      <div class="drawer-section">
        <span class="drawer-label">Role</span>
        <p class="drawer-value">{project.role}</p>
      </div>

      <div class="drawer-section">
        <span class="drawer-label">Tech Stack</span>
        <div class="tech-pills">
          {#each project.techStack as tech}
            <span class="tech-pill">{tech}</span>
          {/each}
        </div>
      </div>

      <div class="drawer-body">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html project.bodyHtml}
      </div>
    </div>
  {/if}
</aside>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 20;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 42%;
    height: 100%;
    background: #121920;
    border-left: 1px solid rgba(255, 140, 0, 0.3);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
    z-index: 30;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
    outline: none;
  }

  .drawer.open {
    transform: translateX(0);
  }

  .drawer-inner {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .drawer-title {
    color: rgb(255, 140, 0);
    font-size: 1.1rem;
    line-height: 1.3;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgb(170, 170, 170);
    cursor: pointer;
    font-size: 1rem;
    padding: 0.1rem 0.3rem;
    line-height: 1;
    flex-shrink: 0;
    font-family: inherit;
  }

  .close-btn:hover {
    color: rgb(241, 241, 241);
  }

  .drawer-screenshot {
    width: 100%;
    height: auto;
    border-radius: 4px;
    display: block;
    margin: 0;
  }

  .drawer-link {
    color: rgb(255, 140, 0);
    font-size: 0.85rem;
    word-break: break-all;
  }

  .drawer-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .drawer-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgb(100, 110, 120);
  }

  .drawer-value {
    color: rgb(200, 200, 200);
    font-size: 0.85rem;
    margin: 0;
  }

  .tech-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .tech-pill {
    background: #1a2a3a;
    color: #7ab;
    border: 1px solid #2a3a4a;
    border-radius: 3px;
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
  }

  .drawer-body {
    color: rgb(200, 200, 200);
    font-size: 0.9rem;
    line-height: 1.7;
  }

  /* Mobile: slide from bottom */
  @media (max-width: 599px) {
    .drawer {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 80vh;
      border-left: none;
      border-top: 1px solid rgba(255, 140, 0, 0.3);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.5);
      transform: translateY(100%);
      border-radius: 12px 12px 0 0;
    }

    .drawer.open {
      transform: translateY(0);
    }
  }
</style>
