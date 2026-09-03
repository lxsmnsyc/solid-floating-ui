import { DEV } from 'solid-js';

const devMessageSet = DEV ? new Set<string>() : undefined;

export function warn(...messages: string[]): void {
  const message = `Floating UI: ${messages.join(' ')}`;
  if (devMessageSet && !devMessageSet.has(message)) {
    devMessageSet.add(message);
    // Warning about a misconfiguration is the point of this module.
    // oxlint-disable-next-line no-console
    console.warn(message);
  }
}

export function error(...messages: string[]): void {
  const message = `Floating UI: ${messages.join(' ')}`;
  if (devMessageSet && !devMessageSet.has(message)) {
    devMessageSet.add(message);
    // Reporting a misconfiguration is the point of this module.
    // oxlint-disable-next-line no-console
    console.error(message);
  }
}
