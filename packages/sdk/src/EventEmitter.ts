// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Typed EventEmitter
// Browser-safe, zero-dependency, fully typed event emitter
// ═══════════════════════════════════════════════════════════════

export class TypedEventEmitter<
  Events extends Record<string, (...args: any[]) => void>,
> {
  private _listeners = new Map<string, Set<Function>>();

  /**
   * Register an event listener.
   */
  on<E extends keyof Events & string>(event: E, listener: Events[E]): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener);
    return this;
  }

  /**
   * Register a one-time event listener.
   */
  once<E extends keyof Events & string>(event: E, listener: Events[E]): this {
    const wrapper = ((...args: any[]) => {
      this.off(event, wrapper as Events[E]);
      (listener as Function)(...args);
    }) as Events[E];
    return this.on(event, wrapper);
  }

  /**
   * Remove an event listener.
   */
  off<E extends keyof Events & string>(event: E, listener: Events[E]): this {
    this._listeners.get(event)?.delete(listener);
    return this;
  }

  /**
   * Emit an event to all registered listeners.
   */
  protected emit<E extends keyof Events & string>(
    event: E,
    ...args: Parameters<Events[E]>
  ): boolean {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const fn of set) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[HiveRTC] Error in '${event}' listener:`, err);
      }
    }
    return true;
  }

  /**
   * Remove all listeners for a specific event, or all events.
   */
  removeAllListeners(event?: keyof Events & string): void {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Get the number of listeners for a given event.
   */
  listenerCount(event: keyof Events & string): number {
    return this._listeners.get(event)?.size ?? 0;
  }
}
