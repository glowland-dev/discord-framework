export function warnDuplicate(scope: string, key: string): void {
  if (process.env.NODE_ENV === "production") return;

  console.warn(
    `[${scope}] Duplicate component detected: ${key}. Last loaded module wins.`,
  );
}
