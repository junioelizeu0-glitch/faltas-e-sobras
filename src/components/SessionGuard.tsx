export default function SessionGuard() {
  return null;
}

export function markTabSessionActive() {
  try {
    sessionStorage.setItem("tab-session-active", "1");
  } catch {}
}
