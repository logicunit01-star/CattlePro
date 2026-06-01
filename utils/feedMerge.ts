import { FeedInventory } from '../types';

/** Keep a single feed row per id in app state (idempotent create / retry-safe). */
export function mergeFeedList(feed: FeedInventory[], saved: FeedInventory): FeedInventory[] {
  const index = feed.findIndex((item) => item.id === saved.id);
  if (index === -1) return [...feed, saved];
  const next = feed.slice();
  next[index] = saved;
  return next;
}
