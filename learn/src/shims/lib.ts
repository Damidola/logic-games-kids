// Замінник модуля lila «lib»: лише prop().
export type Prop<T> = { (): T; (v: T): T };
export function prop<T>(initial: T): Prop<T> {
  let v = initial;
  return ((nv?: T) => { if (nv !== undefined) v = nv; return v; }) as Prop<T>;
}
export type WithGround = <A>(f: (g: CgApi) => A) => A | undefined;
