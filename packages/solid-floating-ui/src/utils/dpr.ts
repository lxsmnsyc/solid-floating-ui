export function getDPR(element: Element): number {
  if (typeof window === 'undefined') {
    return 1;
  }
  const win = element.ownerDocument.defaultView ?? window;
  const ratio = win.devicePixelRatio;
  return ratio > 0 ? ratio : 1;
}

export function roundByDPR(element: Element, value: number): number {
  const dpr = getDPR(element);
  return Math.round(value * dpr) / dpr;
}
