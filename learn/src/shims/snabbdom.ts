// Замінник snabbdom.h: у нас просто DOM-елементи (для картинок до розділів).
export type VNode = HTMLElement;
export function h(sel: string, a?: any, b?: any): HTMLElement {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  let data = a, kids = b;
  if (Array.isArray(a) || typeof a === 'string' || a instanceof Node) { data = undefined; kids = a; }
  if (data?.attrs) for (const k in data.attrs) el.setAttribute(k, data.attrs[k]);
  for (const k of [].concat(kids ?? [])) el.append(k as any);
  return el;
}
