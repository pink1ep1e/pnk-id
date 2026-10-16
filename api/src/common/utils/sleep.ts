export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Progressive delay after failed logins (capped). */
export function loginDelayMs(failCount: number): number {
  if (failCount <= 0) return 0;
  return Math.min(failCount * 250, 3000);
}
