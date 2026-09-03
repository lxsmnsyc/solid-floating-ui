import type {
  ComputePositionConfig,
  ComputePositionReturn,
  MiddlewareData,
  Placement,
  Platform,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';
import type { JSX } from 'solid-js';
import type { ExtendedUserProps } from './hooks/useInteractions';

export type ReferenceType = Element | VirtualElement;

export type NarrowedElement<T> = T extends Element ? T : Element;

export type Orientation = 'vertical' | 'horizontal' | 'both';

/**
 * The props an interaction hook contributes to an element. Values are read
 * lazily by `useInteractions`, so getters stay reactive when spread onto JSX.
 */
export type AnyElementProps = Omit<JSX.HTMLAttributes<HTMLElement>, 'ref'> & {
  ref?: ((element: HTMLElement) => void) | undefined;
} & Record<string, unknown>;

export interface ElementProps {
  reference?: AnyElementProps | undefined;
  floating?: AnyElementProps | undefined;
  item?: AnyElementProps | ((props: ExtendedUserProps) => AnyElementProps) | undefined;
}

export type OpenChangeReason =
  | 'outside-press'
  | 'escape-key'
  | 'ancestor-scroll'
  | 'reference-press'
  | 'click'
  | 'hover'
  | 'focus'
  | 'focus-out'
  | 'list-navigation'
  | 'safe-polygon';

export type Delay = number | Partial<{ open: number | undefined; close: number | undefined }>;

export interface OpenChangeEvent {
  open: boolean;
  event?: Event | undefined;
  reason?: OpenChangeReason | undefined;
  nested: boolean;
}

/**
 * The events the hooks publish to one another through `FloatingEvents`.
 */
export interface FloatingEventMap {
  openchange: OpenChangeEvent;
  virtualfocus: HTMLElement;
}

export interface FloatingEvents {
  emit<K extends keyof FloatingEventMap>(event: K, data: FloatingEventMap[K]): void;
  on<K extends keyof FloatingEventMap>(
    event: K,
    handler: (data: FloatingEventMap[K]) => void,
  ): void;
  off<K extends keyof FloatingEventMap>(
    event: K,
    handler: (data: FloatingEventMap[K]) => void,
  ): void;
}

/**
 * State shared between the hooks attached to one floating element. The fields
 * are declared rather than left to an index signature so that consumers do not
 * have to assert their way back to a usable type.
 */
export interface ContextData {
  /** The event that opened the floating element, when there was one. */
  openEvent?: Event | undefined;
  /** The full context, published by `useFloating` for the hooks to read. */
  floatingContext?: FloatingContext | undefined;
  /** Set by `useTypeahead` while the user is typing. */
  typing?: boolean | undefined;
  /** Published by `useListNavigation` for nested lists to read. */
  orientation?: Orientation | undefined;
  /** Whether `useDismiss` lets the escape key bubble through the tree. */
  escapeKeyBubbles?: boolean | undefined;
  /** Whether `useDismiss` lets an outside press bubble through the tree. */
  outsidePressBubbles?: boolean | undefined;
  /** Set while a press or focus change happened inside the floating tree. */
  insideTree?: boolean | undefined;
}

/**
 * The setters that attach the elements. Read the elements back through
 * `elements`, which is reactive.
 */
export interface ExtendedRefs<RT extends ReferenceType = ReferenceType> {
  setReference(node: RT | null): void;
  setFloating(node: HTMLElement | null): void;
  setPositionReference(node: ReferenceType | null): void;
}

/**
 * Reads are reactive: accessing a property inside a tracking scope subscribes
 * to the element it names.
 */
export interface ExtendedElements<RT extends ReferenceType = ReferenceType> {
  readonly reference: RT | null;
  readonly floating: HTMLElement | null;
  readonly domReference: Element | null;
}

export interface FloatingRootContext<RT extends ReferenceType = ReferenceType> {
  /**
   * State the hooks attached to this floating element share. Mutated in place,
   * so reads are not reactive.
   */
  data: ContextData;
  readonly open: boolean;
  onOpenChange(open: boolean, event?: Event, reason?: OpenChangeReason): void;
  readonly elements: {
    readonly domReference: Element | null;
    readonly reference: RT | null;
    readonly floating: HTMLElement | null;
  };
  events: FloatingEvents;
  floatingId: string;
  refs: {
    setPositionReference(node: ReferenceType | null): void;
  };
}

export interface UsePositionData {
  readonly x: number;
  readonly y: number;
  readonly placement: Placement;
  readonly strategy: Strategy;
  readonly middlewareData: MiddlewareData;
  readonly isPositioned: boolean;
}

export interface UsePositionReturn<
  RT extends ReferenceType = ReferenceType,
> extends UsePositionData {
  /**
   * Recompute the position of the floating element.
   */
  update(): void;
  /**
   * Pre-configured positioning styles to apply to the floating element.
   */
  readonly floatingStyles: JSX.CSSProperties;
  refs: {
    setReference(node: RT | null): void;
    setFloating(node: HTMLElement | null): void;
  };
  readonly elements: {
    readonly reference: RT | null;
    readonly floating: HTMLElement | null;
  };
}

export interface FloatingContext<RT extends ReferenceType = ReferenceType> extends UsePositionData {
  update(): void;
  readonly floatingStyles: JSX.CSSProperties;
  readonly open: boolean;
  onOpenChange(open: boolean, event?: Event, reason?: OpenChangeReason): void;
  events: FloatingEvents;
  data: ContextData;
  nodeId: string | undefined;
  floatingId: string;
  refs: ExtendedRefs<RT>;
  elements: ExtendedElements<RT>;
}

export interface UseFloatingReturn<
  RT extends ReferenceType = ReferenceType,
> extends UsePositionData {
  update(): void;
  readonly floatingStyles: JSX.CSSProperties;
  /**
   * The context passed to every interaction hook and floating component.
   */
  context: FloatingContext<RT>;
  refs: ExtendedRefs<RT>;
  elements: ExtendedElements<RT>;
}

export interface UsePositionOptions<RT extends ReferenceType = ReferenceType> extends Partial<
  Omit<ComputePositionConfig, 'platform'>
> {
  platform?: Platform | undefined;
  /**
   * Invoked when both elements are mounted, and cleaned up when either
   * unmounts. Pass `autoUpdate` here to keep the position in sync.
   */
  whileElementsMounted?:
    | ((reference: RT, floating: HTMLElement, update: () => void) => () => void)
    | undefined;
  elements?:
    | {
        reference?: RT | null | undefined;
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
  /**
   * The `open` state of the floating element, synchronized with
   * `isPositioned`.
   * @default false
   */
  open?: boolean | undefined;
  /**
   * Whether to position with `transform` instead of `top` and `left`.
   * @default true
   */
  transform?: boolean | undefined;
}

export interface UseFloatingOptions<RT extends ReferenceType = ReferenceType> extends Omit<
  UsePositionOptions<RT>,
  'elements'
> {
  rootContext?: FloatingRootContext<RT> | undefined;
  elements?:
    | {
        reference?: Element | null | undefined;
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
  /**
   * Invoked when the floating element is opened or closed.
   */
  onOpenChange?: ((open: boolean, event?: Event, reason?: OpenChangeReason) => void) | undefined;
  /**
   * Unique node id when using `FloatingTree`.
   */
  nodeId?: string | undefined;
}

export interface FloatingNodeType<RT extends ReferenceType = ReferenceType> {
  id: string | undefined;
  parentId: string | null;
  context?: FloatingContext<RT> | undefined;
}

export interface FloatingTreeType<RT extends ReferenceType = ReferenceType> {
  /**
   * The registered nodes. Reactive: reading it inside a tracking scope
   * subscribes to the tree changing.
   */
  nodes(): FloatingNodeType<RT>[];
  events: FloatingEvents;
  addNode(node: FloatingNodeType): void;
  removeNode(node: FloatingNodeType): void;
}

export type { ComputePositionReturn };
