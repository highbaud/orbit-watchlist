export function isWithinRefreshWindow(lastSuccessfulRefreshAt: string | undefined, now: number, windowMs: number): boolean {
  if (!lastSuccessfulRefreshAt) return false;
  const lastSuccess = Date.parse(lastSuccessfulRefreshAt);
  return Number.isFinite(lastSuccess) && now >= lastSuccess && now - lastSuccess < windowMs;
}
