// M7 touch and aim (canon §18). Render and input numbers, in CSS pixels unless noted.
export const AIM = {
  /** The loupe's centre sits this far above the finger. */
  loupeLift: 104,
  /** Loupe radius. */
  loupeR: 58,
  /** Whole-number magnification inside the loupe. */
  loupeZoom: 2,
  /** Gap kept between the loupe and the top of the screen before it moves beside the finger. */
  loupeTopGap: 8,
  /** Crosshair mode: the aim point floats this far above the finger. */
  crossLift: 64,
} as const;

export const SMART_DIG = {
  /** A tap on rock this many tiles (Chebyshev) from exposed ore digs the ore instead. */
  snap: 1,
  /** A press held this long on ore, without dragging, takes the whole vein (ms). */
  veinHoldMs: 600,
} as const;

/** M7-06 vibration lengths (ms). */
export const HAPTICS = { hold: 12, brk: 6, ore: 14, rushOre: 24 } as const;

/** canon §18 M7-03: how long the mouse rests on a tile before its label shows (ms), and the label's offset (CSS px). */
export const HOVER = { delayMs: 400, dx: 18, dy: -10 } as const;

/**
 * canon §18 M7-05: whole-number art scales the player can step through (art px per CSS px), the pinch ratio
 * and wheel travel that make one step.
 */
export const ZOOM = { phone: [1, 2, 3], desk: [2, 3, 4], pinchStep: 1.3, wheelStep: 60 } as const;

/**
 * canon §18 M7-05: the Mountain view. Rows of sky above the grass, rows below the deepest worker,
 * CSS px kept clear for the HUD at the top and bottom, and how often the map is redrawn (ms).
 */
export const MOUNTAIN = { sky: 6, below: 6, padTop: 84, padBottom: 124, redrawMs: 250 } as const;
