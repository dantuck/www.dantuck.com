<script>
  import { onMount } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import ReadingFontToggle from './ReadingFontToggle.svelte';

  // The footer persists across client-side navigation, so the bar has to re-check on every
  // page load whether the current page is an article (BlogPost marks its <main> with
  // data-reading-progress).
  onMount(() => {
    const progress = document.getElementById("reading-progress");
    let enabled = false;
    let timeOfLastScroll = 0;
    let requestedAniFrame = false;
    let winHeight = 1000;
    let bottom = 10000;

    function scroll() {
      if (!enabled) return;
      if (!requestedAniFrame) {
        requestAnimationFrame(updateProgress);
        requestedAniFrame = true;
      }
      timeOfLastScroll = Date.now();
    }

    function updateProgress() {
      requestedAniFrame = false;
      if (!enabled) return;
      const percent = Math.min(
        (document.scrollingElement.scrollTop / (bottom - winHeight)) * 100,
        100
      );
      progress.style.transform = `translate(-${100 - percent}vw, 0)`;
      if (Date.now() - timeOfLastScroll < 3000) {
        requestAnimationFrame(updateProgress);
        requestedAniFrame = true;
      }
    }

    const observer = new ResizeObserver(() => {
      bottom =
        document.scrollingElement.scrollTop +
        document.querySelector("footer").getBoundingClientRect().top;
      winHeight = window.innerHeight;
      scroll();
    });

    function sync() {
      enabled = !!document.querySelector("[data-reading-progress]");
      progress.hidden = !enabled;
      progress.style.transform = "";
      observer.disconnect();
      if (enabled) observer.observe(document.body);
    }

    addEventListener("scroll", scroll);
    document.addEventListener("astro:page-load", sync);
    sync();

    return () => {
      removeEventListener("scroll", scroll);
      document.removeEventListener("astro:page-load", sync);
      observer.disconnect();
    };
  });
</script>

<footer class="max-content hairline py-10 mt-8 text-center text-[85%] text-site-text-muted">
  <div class="footer-controls">
    <ReadingFontToggle />
    <ThemeToggle />
  </div>
  <a rel="me noopener noreferrer" href="https://fosstodon.org/@tuck" target="_blank">@tuck@fosstodon.org | Mastodon</a>
  <div id="reading-progress" aria-hidden="true"></div>
</footer>

<style>
  .footer-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  #reading-progress {
    z-index: 1;
    background-color: var(--color-accent);
    width: 100vw;
    height: 0.25rem;
    position: fixed;
    left: 0;
    bottom: 0;
    transform: translate(-100vw, 0);
    will-change: transform;
    pointer-events: none;
    margin: 0;
  }
</style>
