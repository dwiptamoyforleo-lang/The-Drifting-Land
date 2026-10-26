/**
 * Centralized in-game notification toast manager for The Drifting Land.
 * Emits non-intrusive game event notices (quest updates, items collected, relics, discoveries).
 */

import { NotificationItem } from '../types/game';

type NotificationListener = (notifications: NotificationItem[]) => void;

export class NotificationSystem {
  private static notifications: NotificationItem[] = [];
  private static listeners: Set<NotificationListener> = new Set();
  private static counter = 0;

  static subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  static notify(
    title: string,
    message: string,
    type: 'info' | 'quest' | 'relic' | 'item' | 'discovery' | 'danger' = 'info',
    durationMs = 4000
  ): void {
    const item: NotificationItem = {
      id: `notif_${Date.now()}_${++this.counter}`,
      title,
      message,
      type,
      timestamp: Date.now(),
      durationMs,
    };

    this.notifications.push(item);
    this.broadcast();

    setTimeout(() => {
      this.remove(item.id);
    }, durationMs);
  }

  static remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.broadcast();
  }

  private static broadcast(): void {
    const snapshot = [...this.notifications];
    this.listeners.forEach((fn) => fn(snapshot));
  }
}
