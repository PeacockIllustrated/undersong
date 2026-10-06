// Big numbers for every resource, cost and rate. ADR-004
import Decimal from 'break_eternity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;
export const D = (v: DecimalSource): Decimal => new Decimal(v);
export const ZERO = (): Decimal => new Decimal(0);
