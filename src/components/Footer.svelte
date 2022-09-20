<script>
    // console.log(window.ResizeObserver)
    import { onMount } from 'svelte';

    onMount(() => {
      console.log('the component has mounted');
      // console.log(window.ResizeObserver)
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
            document.querySelector("#comments,footer").getBoundingClientRect().top;
          winHeight = window.innerHeight;
          scroll();
        }).observe(document.body);
      }
    }



</script>

<svelte:window on:resize={handleObserver}/>

<footer>
    <a href="/about/">about</a>
    <div id="reading-progress" aria-hidden="true"></div>
</footer>
