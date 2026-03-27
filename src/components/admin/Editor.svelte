<script lang="ts">
  // Stub — full implementation in Task 11
  // Slug is read from URL search params: /admin/edit?slug=article/foo/bar
  let slug: string | undefined = undefined;
  if (typeof window !== 'undefined') {
    slug = new URLSearchParams(window.location.search).get('slug') ?? undefined;
  }
</script>
<div class="admin-stub">Editor loading... {slug ?? 'new'}</div>
