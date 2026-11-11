const locks = new Map<string, Promise<void>>();

/** One git worktree mutation at a time per clone/repo slug. */
export async function withRepoLock<T>(repoKey: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(repoKey) ?? Promise.resolve();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(repoKey, prev.then(() => held));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}
