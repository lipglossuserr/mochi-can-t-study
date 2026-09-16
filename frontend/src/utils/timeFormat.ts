/**
 * MM:SS below one hour, HH:MM:SS at one hour and above — matching the
 * project requirement exactly.
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}
export function formatClockTime(seconds: number): string {
  if (!seconds || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
  ).padStart(2, "0")}`;
}
