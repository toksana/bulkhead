/** Messages exchanged between the main thread and the render worker. */

export interface InitMessage {
  readonly type: 'init';
  readonly canvas: OffscreenCanvas;
  /** CSS color used for drawn marks; resolved on the main thread so the worker never hardcodes one. */
  readonly markColor: string;
}

export type MainToWorker = InitMessage;

export interface ReadyMessage {
  readonly type: 'ready';
  /** Where the worker script was loaded from; used to confirm it is served from the page origin. */
  readonly scriptUrl: string;
}

export interface StatsMessage {
  readonly type: 'stats';
  readonly frames: number;
  readonly fps: number;
}

export interface FailureMessage {
  readonly type: 'failed';
  readonly message: string;
}

export type WorkerToMain = ReadyMessage | StatsMessage | FailureMessage;
