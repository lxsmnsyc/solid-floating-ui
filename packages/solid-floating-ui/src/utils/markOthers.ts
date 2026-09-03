// Modified to add conditional `aria-hidden` support:
// https://github.com/theKashey/aria-hidden/blob/9220c8f4a4fd35f63bee5510a9f41a37264382d4/src/index.ts
import { getNodeName, isShadowRoot } from '@floating-ui/utils/dom';
import { getDocument } from './element';

type Undo = () => void;

const counters = {
  inert: new WeakMap<Element, number>(),
  'aria-hidden': new WeakMap<Element, number>(),
  none: new WeakMap<Element, number>(),
};

function getCounterMap(control: 'inert' | 'aria-hidden' | null): WeakMap<Element, number> {
  if (control === 'inert') {
    return counters.inert;
  }
  if (control === 'aria-hidden') {
    return counters['aria-hidden'];
  }
  return counters.none;
}

let uncontrolledElementsSet = new WeakSet<Element>();
let markerCounter = new WeakMap<Element, number>();
let lockCount = 0;

export const supportsInert = (): boolean =>
  typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

function unwrapHost(node: Node | null): Element | null {
  if (!node) {
    return null;
  }

  return isShadowRoot(node) ? node.host : unwrapHost(node.parentNode);
}

const correctElements = (parent: HTMLElement, targets: Element[]): Element[] =>
  targets
    .map((target) => {
      if (parent.contains(target)) {
        return target;
      }

      const correctedTarget = unwrapHost(target);

      if (parent.contains(correctedTarget)) {
        return correctedTarget;
      }

      return null;
    })
    .filter((x): x is Element => x != null);

function applyAttributeToOthers(
  uncorrectedAvoidElements: Element[],
  body: HTMLElement,
  ariaHidden: boolean,
  inert: boolean,
): Undo {
  const markerName = 'data-floating-ui-inert';
  let controlAttribute: 'inert' | 'aria-hidden' | null = null;
  if (inert) {
    controlAttribute = 'inert';
  } else if (ariaHidden) {
    controlAttribute = 'aria-hidden';
  }
  const avoidElements = correctElements(body, uncorrectedAvoidElements);
  const elementsToKeep = new Set<Node>();
  const elementsToStop = new Set<Node>(avoidElements);
  const hiddenElements: Element[] = [];

  function keep(el: Node | null | undefined): void {
    if (!el || elementsToKeep.has(el)) {
      return;
    }
    elementsToKeep.add(el);
    keep(el.parentNode);
  }

  function deep(parent: Element | null): void {
    if (!parent || elementsToStop.has(parent)) {
      return;
    }

    for (const node of Array.from(parent.children)) {
      if (getNodeName(node) === 'script') {
        continue;
      }

      if (elementsToKeep.has(node)) {
        deep(node);
      } else {
        const attr = controlAttribute ? node.getAttribute(controlAttribute) : null;
        const alreadyHidden = attr !== null && attr !== 'false';
        const counterMap = getCounterMap(controlAttribute);
        const counterValue = (counterMap.get(node) ?? 0) + 1;
        const markerValue = (markerCounter.get(node) ?? 0) + 1;

        counterMap.set(node, counterValue);
        markerCounter.set(node, markerValue);
        hiddenElements.push(node);

        if (counterValue === 1 && alreadyHidden) {
          uncontrolledElementsSet.add(node);
        }

        if (markerValue === 1) {
          node.setAttribute(markerName, '');
        }

        if (!alreadyHidden && controlAttribute) {
          node.setAttribute(controlAttribute, controlAttribute === 'inert' ? '' : 'true');
        }
      }
    }
  }

  for (const element of avoidElements) {
    keep(element);
  }
  deep(body);
  elementsToKeep.clear();

  lockCount++;

  return () => {
    for (const element of hiddenElements) {
      const counterMap = getCounterMap(controlAttribute);
      const currentCounterValue = counterMap.get(element) ?? 0;
      const counterValue = currentCounterValue - 1;
      const markerValue = (markerCounter.get(element) ?? 0) - 1;

      counterMap.set(element, counterValue);
      markerCounter.set(element, markerValue);

      if (!counterValue) {
        if (!uncontrolledElementsSet.has(element) && controlAttribute) {
          element.removeAttribute(controlAttribute);
        }
        uncontrolledElementsSet.delete(element);
      }

      if (!markerValue) {
        element.removeAttribute(markerName);
      }
    }

    lockCount--;

    if (!lockCount) {
      counters.inert = new WeakMap();
      counters['aria-hidden'] = new WeakMap();
      counters.none = new WeakMap();
      uncontrolledElementsSet = new WeakSet();
      markerCounter = new WeakMap();
    }
  };
}

export function markOthers(avoidElements: Element[], ariaHidden = false, inert = false): Undo {
  const body = getDocument(avoidElements[0] ?? null).body;
  return applyAttributeToOthers(
    avoidElements.concat(Array.from(body.querySelectorAll('[aria-live],[role="status"],output'))),
    body,
    ariaHidden,
    inert,
  );
}
