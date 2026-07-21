<script>
  import { onMount } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import ReadingFontToggle from './ReadingFontToggle.svelte';

  onMount(() => {
    handleObserver();
  });

  const handleObserver = () => {
    if (document.querySelector("header nav #nav")) {
      var progress = document.getElementById("reading-progress");
      var timeOfLastScroll = 0;
      var requestedAniFrame = false;

      function scroll() {
        if (!requestedAniFrame) {
          requestAnimationFrame(updateProgress);
          requestedAniFrame = true;
        }
        timeOfLastScroll = Date.now();
      }
      addEventListener("scroll", scroll);

      var winHeight = 1000;
      var bottom = 10000;

      function updateProgress() {
        requestedAniFrame = false;
        var percent = Math.min(
          (document.scrollingElement.scrollTop / (bottom - winHeight)) * 100,
          100
        );
        progress.style.transform = `translate(-${100 - percent}vw, 0)`;
        if (Date.now() - timeOfLastScroll < 3000) {
          requestAnimationFrame(updateProgress);
          requestedAniFrame = true;
        }
      }

      new ResizeObserver(() => {
        bottom =
          document.scrollingElement.scrollTop +
          document.querySelector("footer").getBoundingClientRect().top;
        winHeight = window.innerHeight;
        scroll();
      }).observe(document.body);
    }
  };
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
