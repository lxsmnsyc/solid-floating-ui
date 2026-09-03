import { useFloatingParentNodeId } from '../components/FloatingTree';
import type { AnyElementProps, ElementProps, FloatingRootContext } from '../types';
import { getFloatingFocusElement } from '../utils/element';
import { lazyProps } from '../utils/reactivity';
import useId from './useId';
import type { ExtendedUserProps } from './useInteractions';

type AriaRole = 'tooltip' | 'dialog' | 'alertdialog' | 'menu' | 'listbox' | 'grid' | 'tree';
type ComponentRole = 'select' | 'label' | 'combobox';

export interface UseRoleProps {
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The role of the floating element.
   * @default 'dialog'
   */
  role?: AriaRole | ComponentRole | undefined;
}

/**
 * Anything the component-role map does not rewrite is already an ARIA role.
 */
function isAriaRole(role: AriaRole | ComponentRole): role is AriaRole {
  return role !== 'select' && role !== 'label' && role !== 'combobox';
}

const componentRoleToAriaRoleMap = new Map<AriaRole | ComponentRole, AriaRole | false>([
  ['select', 'listbox'],
  ['combobox', 'listbox'],
  ['label', false],
]);

/**
 * Adds base screen reader props to the reference and floating elements for a
 * given floating element `role`.
 */
export function useRole(context: FloatingRootContext, props: UseRoleProps = {}): ElementProps {
  const role = (): AriaRole | ComponentRole => props.role ?? 'dialog';

  const defaultReferenceId = useId();
  const referenceId = (): string => {
    const id = context.elements.domReference?.id;
    return id === undefined || id === '' ? defaultReferenceId : id;
  };
  const floatingId = (): string => {
    const id = getFloatingFocusElement(context.elements.floating)?.id;
    return id === undefined || id === '' ? context.floatingId : id;
  };

  const ariaRole = (): AriaRole | false => {
    const current = role();
    const mapped = componentRoleToAriaRoleMap.get(current);
    if (mapped !== undefined) {
      return mapped;
    }
    return isAriaRole(current) ? current : false;
  };

  const isNested = useFloatingParentNodeId() != null;

  function referenceProps(): AnyElementProps {
    const currentRole = role();
    const currentAriaRole = ariaRole();

    if (currentAriaRole === 'tooltip' || currentRole === 'label') {
      return {
        [`aria-${currentRole === 'label' ? 'labelledby' : 'describedby'}`]: context.open
          ? floatingId()
          : undefined,
      };
    }

    return {
      'aria-expanded': context.open ? 'true' : 'false',
      'aria-haspopup': currentAriaRole === 'alertdialog' ? 'dialog' : currentAriaRole,
      'aria-controls': context.open ? floatingId() : undefined,
      ...(currentAriaRole === 'listbox' && { role: 'combobox' }),
      ...(currentAriaRole === 'menu' && { id: referenceId() }),
      ...(currentAriaRole === 'menu' && isNested && { role: 'menuitem' }),
      ...(currentRole === 'select' && { 'aria-autocomplete': 'none' }),
      ...(currentRole === 'combobox' && { 'aria-autocomplete': 'list' }),
    };
  }

  function floatingProps(): AnyElementProps {
    const currentRole = role();
    const currentAriaRole = ariaRole();

    const base: AnyElementProps = {
      id: floatingId(),
      ...(currentAriaRole && { role: currentAriaRole }),
    };

    if (currentAriaRole === 'tooltip' || currentRole === 'label') {
      return base;
    }

    return {
      ...base,
      ...(currentAriaRole === 'menu' && { 'aria-labelledby': referenceId() }),
    };
  }

  // Solid's JSX types spell the ARIA pseudo booleans out as strings, and drop
  // the attribute when the value is `undefined`.
  function ariaBoolean(value: boolean | undefined): 'true' | 'false' | undefined {
    if (value == null) {
      return undefined;
    }
    return value ? 'true' : 'false';
  }

  function item({ active, selected }: ExtendedUserProps): AnyElementProps {
    const commonProps: AnyElementProps = {
      role: 'option',
      ...(active && { id: `${floatingId()}-fui-option` }),
    };

    // For `menu`, we are unable to tell if the item is a `menuitemradio`
    // or `menuitemcheckbox`. For backwards-compatibility reasons, also
    // avoid defaulting to `menuitem` as it may overwrite custom role props.
    switch (role()) {
      case 'select':
      case 'combobox':
        return {
          ...commonProps,
          'aria-selected': ariaBoolean(selected),
        };
      case 'alertdialog':
      case 'dialog':
      case 'grid':
      case 'label':
      case 'listbox':
      case 'menu':
      case 'tooltip':
      case 'tree':
      default:
        return {};
    }
  }

  const enabled = (): boolean => props.enabled !== false;

  const reference = lazyProps(referenceProps);
  const floating = lazyProps(floatingProps);

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
    get floating() {
      return enabled() ? floating : undefined;
    },
    get item() {
      return enabled() ? item : undefined;
    },
  };
}
