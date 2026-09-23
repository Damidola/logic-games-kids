// Замінник lila «lib/view»: теги-функції з lila (snabbdomElements.ts), bind, onInsert, confirm.
import { h, type Hooks, type VNode } from 'snabbdom';

export function onInsert<A extends HTMLElement>(f: (el: A) => void): Hooks {
  return { insert: vnode => f(vnode.elm as A) };
}
export function bind(eventName: string, f: (e: any) => any, redraw?: () => void): Hooks {
  return onInsert(el => el.addEventListener(eventName, e => { const r = f(e); redraw?.(); return r; }, { passive: true }));
}
export const confirm = async (msg: string) => window.confirm(msg);

const DATA_KEYS = new Set(['props', 'attrs', 'class', 'dataset', 'on', 'attachData', 'hook', 'key', 'ns', 'fn', 'args', 'style']);
const isVNode = (v: any) => v !== null && typeof v === 'object' && ('sel' in v || 'text' in v || 'children' in v);
const isData = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v) && !isVNode(v);
const isSel = (v: any) => typeof v === 'string' && /^[.#[]/.test(v);
function toAttrs(data: any) {
  if (!data) return data;
  const out: any = { ...data, attrs: { ...data.attrs } };
  for (const k of Object.keys(data))
    if (!DATA_KEYS.has(k) && ['string', 'number', 'boolean'].includes(typeof data[k])) { out.attrs[k] = data[k]; delete out[k]; }
  return out;
}
function norm(a?: any, b?: any): [any, any] {
  if (b !== undefined) return [a, b];
  if (isData(a) || a === null) return [a, []];
  return [{}, a ?? []];
}
function tag(name: string, defaults?: Record<string, unknown>) {
  return (a?: any, b?: any, c?: any): VNode => {
    const [sel, data, kids] = isSel(a) ? [name + a, ...norm(b, c)] : [name, ...norm(a, b)];
    return h(sel, toAttrs({ ...defaults, ...data }), Array.isArray(kids) ? kids.flat(5).filter(k => k != null) : kids);
  };
}
export const div = tag('div'), p = tag('p'), span = tag('span'), button = tag('button'), h1 = tag('h1'), h2 = tag('h2');
export const a = (href: string) => tag('a', { href });
export const img = (src: string, alt?: string) => tag('img', { src, alt: alt ?? '' });
export const icon = (i: string) => tag('icon', { 'data-icon': i });
