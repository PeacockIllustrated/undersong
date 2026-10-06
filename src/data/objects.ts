// Objects placed in air tiles. canon §9–§12.
export type ObjKind = 'torch' | 'lantern' | 'support' | 'pump' | 'vent' | 'chest' | 'rope';

export interface ObjDef {
  kind: ObjKind;
  name: string;
  sprite: string;
  /** Stock resource consumed when placed (and refunded when removed). */
  stock?: 'torch' | 'lantern' | 'support' | 'pump' | 'vent';
  /** Tile radius of effect for supports, pumps and vents. */
  radius?: number;
}

export const OBJECTS: Record<ObjKind, ObjDef> = {
  torch: { kind: 'torch', name: 'Torch', sprite: 'obj-torch', stock: 'torch' },
  lantern: { kind: 'lantern', name: 'Lantern', sprite: 'obj-lantern', stock: 'lantern' },
  support: { kind: 'support', name: 'Support', sprite: 'obj-support', stock: 'support', radius: 4 },
  pump: { kind: 'pump', name: 'Pump', sprite: 'obj-pump', stock: 'pump', radius: 6 },
  vent: { kind: 'vent', name: 'Cooling vent', sprite: 'obj-vent', stock: 'vent', radius: 5 },
  chest: { kind: 'chest', name: 'Old chest', sprite: 'obj-chest' },
  rope: { kind: 'rope', name: 'Old rope', sprite: 'obj-rope' },
};
