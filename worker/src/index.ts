export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Deploy hook failed: ${res.status} ${res.statusText}`);
    }
  },
};

interface Env {
  DEPLOY_HOOK_URL: string;
}
