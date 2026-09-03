import type { Alignment, Placement, Side } from '@floating-ui/dom';
import { getComputedStyle } from '@floating-ui/utils/dom';
import { type JSX, Show, createEffect, createSignal, createUniqueId, splitProps } from 'solid-js';
import type { FloatingContext } from '../types';

/**
 * Splits a placement such as `bottom-end` into its side and alignment.
 */
function splitPlacement(placement: Placement): {
  side: Side;
  alignment: Alignment | undefined;
} {
  const [side, alignment] = placement.split('-');
  return {
    side: side === 'top' || side === 'right' || side === 'bottom' ? side : 'left',
    alignment: alignment === 'start' || alignment === 'end' ? alignment : undefined,
  };
}

export interface FloatingArrowProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  /**
   * The floating context.
   */
  context: FloatingContext;
  /**
   * Width of the arrow.
   * @default 14
   */
  width?: number | undefined;
  /**
   * Height of the arrow.
   * @default 7
   */
  height?: number | undefined;
  /**
   * The corner radius (rounding) of the arrow tip.
   * @default 0 (sharp)
   */
  tipRadius?: number | undefined;
  /**
   * Forces a static offset over dynamic positioning under a certain condition.
   * If the `shift()` middleware causes the floating element to shift, this
   * value is ignored.
   */
  staticOffset?: string | number | null | undefined;
  /**
   * Custom path string.
   */
  d?: string | undefined;
  /**
   * Stroke (border) color of the arrow.
   */
  stroke?: string | undefined;
  /**
   * Stroke (border) width of the arrow.
   */
  strokeWidth?: number | undefined;
}

/**
 * Renders a pointing arrow triangle.
 */
export function FloatingArrow(props: FloatingArrowProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'context',
    'width',
    'height',
    'tipRadius',
    'strokeWidth',
    'staticOffset',
    'stroke',
    'd',
    'style',
  ]);

  const width = (): number => local.width ?? 14;
  const height = (): number => local.height ?? 7;
  const tipRadius = (): number => local.tipRadius ?? 0;
  const strokeWidth = (): number => local.strokeWidth ?? 0;

  const clipPathId = createUniqueId();
  const [isRTL, setIsRTL] = createSignal(false);

  // https://github.com/floating-ui/floating-ui/issues/2932
  createEffect(() => {
    const floating = local.context.elements.floating;
    if (!floating) {
      return;
    }
    if (getComputedStyle(floating).direction === 'rtl') {
      setIsRTL(true);
    }
  });

  const side = (): Side => splitPlacement(local.context.placement).side;
  const alignment = (): Alignment | undefined => splitPlacement(local.context.placement).alignment;
  const isVerticalSide = (): boolean => side() === 'top' || side() === 'bottom';
  const isCustomShape = (): boolean => !!local.d;

  const computedStaticOffset = (): string | number | null | undefined => {
    const shift = local.context.middlewareData.shift;
    if ((isVerticalSide() && shift?.x) || (!isVerticalSide() && shift?.y)) {
      return null;
    }
    return local.staticOffset;
  };

  // Strokes must be double the border width, so the stroke's width works the
  // way you would expect.
  const computedStrokeWidth = (): number => strokeWidth() * 2;

  const dValue = (): string => {
    if (local.d) {
      return local.d;
    }
    const svgX = (width() / 2) * (tipRadius() / -8 + 1);
    const svgY = ((height() / 2) * tipRadius()) / 4;
    return (
      'M0,0' +
      ` H${width()}` +
      ` L${width() - svgX},${height() - svgY}` +
      ` Q${width() / 2},${height()} ${svgX},${height() - svgY}` +
      ' Z'
    );
  };

  const arrowStyle = (): JSX.CSSProperties => {
    const offset = computedStaticOffset();
    const yOffsetProp = offset && alignment() === 'end' ? 'bottom' : 'top';
    let xOffsetProp = offset && alignment() === 'end' ? 'right' : 'left';
    if (offset && isRTL()) {
      xOffsetProp = alignment() === 'end' ? 'left' : 'right';
    }

    const arrow = local.context.middlewareData.arrow;
    const arrowX = arrow?.x == null ? '' : (offset ?? arrow.x);
    const arrowY = arrow?.y == null ? '' : (offset ?? arrow.y);

    const custom = isCustomShape();
    const rotation = {
      top: custom ? 'rotate(180deg)' : '',
      left: custom ? 'rotate(90deg)' : 'rotate(-90deg)',
      bottom: custom ? '' : 'rotate(180deg)',
      right: custom ? 'rotate(-90deg)' : 'rotate(90deg)',
    }[side()];

    const userStyle = typeof local.style === 'object' ? local.style : {};
    const { transform: userTransform, ...restStyle } = userStyle;

    return {
      position: 'absolute',
      'pointer-events': 'none',
      [xOffsetProp]: arrowX,
      [yOffsetProp]: arrowY,
      [side()]:
        isVerticalSide() || isCustomShape()
          ? '100%'
          : `calc(100% - ${computedStrokeWidth() / 2}px)`,
      transform: [rotation, userTransform].filter(Boolean).join(' '),
      ...restStyle,
    };
  };

  return (
    <Show when={local.context.elements.floating}>
      <svg
        {...rest}
        aria-hidden="true"
        width={isCustomShape() ? width() : width() + computedStrokeWidth()}
        height={width()}
        viewBox={`0 0 ${width()} ${height() > width() ? height() : width()}`}
        style={arrowStyle()}
      >
        <Show when={computedStrokeWidth() > 0}>
          <path
            clip-path={`url(#${clipPathId})`}
            fill="none"
            stroke={local.stroke}
            // Account for the stroke on the fill path rendered below.
            stroke-width={computedStrokeWidth() + (local.d ? 0 : 1)}
            d={dValue()}
          />
        </Show>
        {/* In Firefox, for left/right placements there's a ~0.5px gap where
        the border can show through. Adding a stroke on the fill removes it. */}
        <path stroke={computedStrokeWidth() && !local.d ? rest.fill : 'none'} d={dValue()} />
        {/* Assumes the border-width of the floating element matches the
        stroke. */}
        <clipPath id={clipPathId}>
          <rect
            x={-computedStrokeWidth() / 2}
            y={(computedStrokeWidth() / 2) * (isCustomShape() ? -1 : 1)}
            width={width() + computedStrokeWidth()}
            height={width()}
          />
        </clipPath>
      </svg>
    </Show>
  );
}
