/**
 * Slim shot shape served by the coffee service (`/api/coffee/shots.json`) and
 * mirrored in `src/data/coffee.seed.json`. The page needs nothing more than this.
 */
export interface CoffeeShot {
  /** visualizer.coffee shot UUID. */
  id: string;
  /** ISO 8601 UTC instant, e.g. `2025-05-15T12:50:47.000Z`. */
  startTime: string;
  profileTitle: string | null;
  barista: string | null;
  beanBrand: string | null;
  beanType: string | null;
  roastLevel: string | null;
  /** Coffee bag name when the service resolved one. */
  coffeeBag: string | null;
  decaf: boolean;
}

export interface CoffeeShotsPayload {
  /** When the service produced this payload (ISO 8601 UTC). */
  generatedAt: string;
  /** `startTime` of the newest shot, or null when there are no shots. */
  latestShotAt: string | null;
  shots: CoffeeShot[];
}
