// Замінник модуля lila «lib»: prop() і propWithEffect().
export type Prop<T> = { (): T; (v: T): T };
export function prop<T>(initial: T): Prop<T> {
  let v = initial;
  return ((nv?: T) => { if (nv !== undefined) v = nv; return v; }) as Prop<T>;
}
export function propWithEffect<T>(initial: T, effect: (v: T) => void): Prop<T> {
  let v = initial;
  return ((nv?: T) => { if (nv !== undefined) { v = nv; effect(nv); } return v; }) as Prop<T>;
}
export type WithGround = <A>(f: (g: CgApi) => A) => A | undefined;
