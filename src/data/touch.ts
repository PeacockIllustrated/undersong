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
