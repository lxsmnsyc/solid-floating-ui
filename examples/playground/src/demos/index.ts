import type { Component } from 'solid-js';
import ArrowDemo from './arrow';
import CompositeDemo from './composite';
import ContextMenuDemo from './context-menu';
import CursorDemo from './cursor';
import DelayGroupDemo from './delay-group';
import DialogDemo from './dialog';
import MenuDemo from './menu';
import PopoverDemo from './popover';
import PositioningDemo from './positioning';
import SelectDemo from './select';
import TooltipDemo from './tooltip';
import TransitionDemo from './transition';

export interface DemoEntry {
  id: string;
  title: string;
  description: string;
  component: Component;
}

export const DEMOS: DemoEntry[] = [
  {
    id: 'positioning',
    title: 'Positioning',
    description:
      'The positioning layer on its own. Change the placement and middleware and watch the computed values update.',
    component: PositioningDemo,
  },
  {
    id: 'arrow',
    title: 'Arrow',
    description:
      'FloatingArrow draws the arrow and reads its offset from the arrow middleware, including the shift correction.',
    component: ArrowDemo,
  },
  {
    id: 'tooltip',
    title: 'Tooltip',
    description:
      'useHover and useFocus open it, useDismiss closes it, and useRole supplies the aria-describedby wiring.',
    component: TooltipDemo,
  },
  {
    id: 'popover',
    title: 'Popover',
    description:
      'A click-triggered panel, portalled out of the clipping container and focus-managed.',
    component: PopoverDemo,
  },
  {
    id: 'dialog',
    title: 'Dialog',
    description:
      'FloatingOverlay with a scroll lock, and modal focus management that traps Tab inside the dialog.',
    component: DialogDemo,
  },
  {
    id: 'select',
    title: 'Select',
    description:
      'FloatingList collects the options, useListNavigation moves between them, and useTypeahead jumps to one by name.',
    component: SelectDemo,
  },
  {
    id: 'menu',
    title: 'Nested menus',
    description:
      'FloatingTree relates the submenus to their parents, so one escape key press closes the whole chain.',
    component: MenuDemo,
  },
  {
    id: 'context-menu',
    title: 'Context menu',
    description: 'useClientPoint with explicit coordinates places the menu where the user pressed.',
    component: ContextMenuDemo,
  },
  {
    id: 'cursor',
    title: 'Cursor tracking',
    description:
      'useClientPoint follows the pointer. Restricting it to one axis leaves a stable path into the floating element.',
    component: CursorDemo,
  },
  {
    id: 'composite',
    title: 'Composite',
    description:
      'Arrow key navigation for a group of elements that is not a floating element at all.',
    component: CompositeDemo,
  },
  {
    id: 'transition',
    title: 'Transitions',
    description:
      'useTransitionStyles keeps the element mounted for the length of the closing animation.',
    component: TransitionDemo,
  },
  {
    id: 'delay-group',
    title: 'Delay group',
    description:
      'FloatingDelayGroup shares one hover delay, so the first tooltip waits and the rest appear instantly.',
    component: DelayGroupDemo,
  },
];
