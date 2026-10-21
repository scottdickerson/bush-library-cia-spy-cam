// Messages between the two windows, relayed by the main process.
export type SpycamMessage = 'scan' | 'reset' | 'quit';

export interface SpycamApi {
  send(msg: SpycamMessage): void;
  /** Subscribes to a message; returns an unsubscribe function. */
  on(msg: SpycamMessage, fn: () => void): () => void;
}

declare global {
  interface Window {
    spycam: SpycamApi;
  }
}
