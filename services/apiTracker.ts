/**
 * Lightweight global API-call tracker.
 *
 * - `trackedFetch` wraps `fetch` and increments/decrements an in-flight counter.
 * - `subscribeApiTracker` lets UI subscribe to changes (e.g. for a global top progress bar).
 * - `useApiBusy` exposes the count to React components for per-component loading states.
 *
 * All backend and upload calls flow through `trackedFetch` so the global loader animates automatically
 * — components don't need any per-call wiring to get visible progress feedback.
 */

import { useEffect, useState } from 'react';

type Listener = (count: number) => void;

let activeCount = 0;
const listeners = new Set<Listener>();

function notify() {
    for (const l of listeners) l(activeCount);
}

// --- Error event bus ----------------------------------------------------------
// Lets the app surface a centralized "request failed" toast for network outages
// and 5xx responses without each component re-implementing the same try/catch.
// 4xx is intentionally NOT auto-toasted — those are caller-handled (e.g. 401 =
// session expired, 409 = validation, etc.) and a blanket toast would be noisy.

export type ApiErrorEvent = {
    kind: 'network' | 'server';
    message: string;
    status?: number;
    url?: string;
};

type ErrorListener = (err: ApiErrorEvent) => void;
const errorListeners = new Set<ErrorListener>();

export function subscribeApiErrors(listener: ErrorListener): () => void {
    errorListeners.add(listener);
    return () => {
        errorListeners.delete(listener);
    };
}

function emitApiError(err: ApiErrorEvent): void {
    for (const l of errorListeners) {
        try { l(err); } catch { /* listener errors must never break fetch */ }
    }
}

/** Extract a URL string for diagnostics regardless of input form. */
function urlFromInput(input: RequestInfo | URL): string | undefined {
    try {
        if (typeof input === 'string') return input;
        if (input instanceof URL) return input.toString();
        return (input as Request).url;
    } catch {
        return undefined;
    }
}

export function startApiCall(): void {
    activeCount += 1;
    notify();
}

export function endApiCall(): void {
    activeCount = Math.max(0, activeCount - 1);
    notify();
}

export function getApiActiveCount(): number {
    return activeCount;
}

export function subscribeApiTracker(listener: Listener): () => void {
    listeners.add(listener);
    listener(activeCount);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Drop-in replacement for `fetch` that tracks in-flight requests so the global loader
 * (and any subscribed component) can render progress.
 */
export async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    startApiCall();
    try {
        const res = await fetch(input, init);
        // Surface 5xx server failures globally — the user should know the server is down,
        // even if a particular call site silently catches the throw later. 4xx is intentional
        // app-level signaling (auth, validation, conflict) and stays caller-handled.
        if (res.status >= 500 && res.status <= 599) {
            emitApiError({
                kind: 'server',
                message: `Server error (${res.status}). Please try again in a moment.`,
                status: res.status,
                url: urlFromInput(input),
            });
        }
        return res;
    } catch (err: any) {
        // fetch only throws on transport-level problems (offline, DNS fail, CORS, abort).
        // Emit one global toast so silent .catch() sites still inform the user.
        emitApiError({
            kind: 'network',
            message: err?.name === 'AbortError'
                ? 'Request cancelled.'
                : 'Network error — check your connection and try again.',
            url: urlFromInput(input),
        });
        throw err;
    } finally {
        endApiCall();
    }
}

/**
 * React hook returning the live count of in-flight API calls.
 * Use to disable buttons or render local spinners while any call is pending.
 *
 * @example
 *   const busy = useApiBusy();
 *   <button disabled={busy > 0}>Save</button>
 */
export function useApiBusy(): number {
    const [count, setCount] = useState<number>(getApiActiveCount());
    useEffect(() => subscribeApiTracker(setCount), []);
    return count;
}
