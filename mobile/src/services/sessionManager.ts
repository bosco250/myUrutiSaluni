type SessionExpiryListener = () => void | Promise<void>;

class SessionManager {
  private listeners = new Set<SessionExpiryListener>();
  private hasTriggered = false;

  onSessionExpired(listener: SessionExpiryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifySessionExpired(): void {
    if (this.hasTriggered) {
      return;
    }

    this.hasTriggered = true;

    this.listeners.forEach((listener) => {
      try {
        const result = listener();
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error("Error handling session expiry listener:", error);
          });
        }
      } catch (error) {
        console.error("Error executing session expiry listener:", error);
      }
    });
  }

  hasSessionExpired(): boolean {
    return this.hasTriggered;
  }

  reset(): void {
    this.hasTriggered = false;
  }
}

export const sessionManager = new SessionManager();
