export type AnchorPosition =
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "mid-left"
  | "mid-right";

export interface SnapPoint {
  anchor: AnchorPosition;
  x: number;
  y: number;
}

export function getSnapPoints(
  screenWidth: number,
  screenHeight: number,
  triggerSize: number,
  insets: { top: number; bottom: number; left: number; right: number },
  padding: number = 16
): SnapPoint[] {
  const halfTrigger = triggerSize / 2;
  const bottomY = screenHeight - insets.bottom - padding - halfTrigger;
  const centerY = insets.top + Math.max(
    (screenHeight - insets.top - insets.bottom) / 2,
    halfTrigger + padding
  );
  const clampedCenterY = Math.min(
    screenHeight - insets.bottom - padding - halfTrigger,
    Math.max(insets.top + padding + halfTrigger, centerY)
  );

  return [
    {
      anchor: "bottom-right",
      x: screenWidth - padding - halfTrigger,
      y: bottomY,
    },
    {
      anchor: "bottom-left",
      x: padding + halfTrigger,
      y: bottomY,
    },
    {
      anchor: "bottom-center",
      x: screenWidth / 2,
      y: bottomY,
    },
    {
      anchor: "mid-left",
      x: padding + halfTrigger,
      y: clampedCenterY,
    },
    {
      anchor: "mid-right",
      x: screenWidth - padding - halfTrigger,
      y: clampedCenterY,
    },
  ];
}

export function findClosestSnapPoint(
  x: number,
  y: number,
  snapPoints: SnapPoint[]
): SnapPoint {
  let closest = snapPoints[0];
  let minDist = Infinity;
  
  for (const point of snapPoints) {
    const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
    if (dist < minDist) {
      minDist = dist;
      closest = point;
    }
  }
  
  return closest;
}

export interface RingPosition {
  x: number;
  y: number;
  angle: number;
  ring: number;
  indexInRing: number;
}

export interface LayoutConfig {
  iconSize: number;
  iconContainerSize: number;
  baseRadius: number;
  ringSpacing: number;
  minIconSpacing: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  iconSize: 64,
  iconContainerSize: 80,
  baseRadius: 110,
  ringSpacing: 95,
  minIconSpacing: 20,
};

export function calculateSpiralPositions(
  itemCount: number,
  anchor: AnchorPosition,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): RingPosition[] {
  const positions: RingPosition[] = [];
  const iconFootprint = config.iconContainerSize + config.minIconSpacing;
  const sweepAngle = Math.PI / 2;
  const startRadius = config.baseRadius;
  const radialIncrement = iconFootprint;
  
  let placedCount = 0;
  let ring = 0;
  
  while (placedCount < itemCount) {
    const radius = startRadius + ring * radialIncrement;
    const minAngleStep = iconFootprint / radius;
    const maxIconsInRing = Math.max(1, Math.floor(sweepAngle / minAngleStep));
    const iconsToPlace = Math.min(maxIconsInRing, itemCount - placedCount);
    
    const usedSweep = iconsToPlace * minAngleStep;
    const startPadding = (sweepAngle - usedSweep) / 2;
    
    for (let i = 0; i < iconsToPlace; i++) {
      const localAngle = startPadding + (i + 0.5) * minAngleStep;

      let x: number;
      let y: number;
      let finalAngle: number;

      switch (anchor) {
        case "bottom-right":
          finalAngle = Math.PI / 2 + localAngle;
          x = -Math.abs(Math.cos(finalAngle) * radius);
          y = -Math.abs(Math.sin(finalAngle) * radius);
          break;
        case "bottom-left":
          finalAngle = localAngle;
          x = Math.abs(Math.cos(finalAngle) * radius);
          y = -Math.abs(Math.sin(finalAngle) * radius);
          break;
        case "bottom-center":
          finalAngle = Math.PI / 2 + localAngle;
          x = -Math.abs(Math.cos(finalAngle) * radius);
          y = -Math.abs(Math.sin(finalAngle) * radius);
          break;
        case "mid-left":
          finalAngle = Math.PI + localAngle;
          x = Math.abs(Math.cos(finalAngle) * radius);
          y = Math.sin(finalAngle) * radius;
          break;
        case "mid-right":
          finalAngle = Math.PI + localAngle;
          x = -Math.abs(Math.cos(finalAngle) * radius);
          y = Math.sin(finalAngle) * radius;
          break;
        default:
          finalAngle = Math.PI / 2 + localAngle;
          x = -Math.abs(Math.cos(finalAngle) * radius);
          y = -Math.abs(Math.sin(finalAngle) * radius);
      }
      
      positions.push({
        x,
        y,
        angle: finalAngle,
        ring,
        indexInRing: i,
      });
      placedCount++;
    }
    ring++;
  }
  
  return positions;
}

export function calculateRingDistribution(itemCount: number): number[] {
  const rings: number[] = [];
  let remaining = itemCount;
  let ringIndex = 0;
  
  while (remaining > 0) {
    const itemsInRing = 3 + ringIndex;
    rings.push(Math.min(itemsInRing, remaining));
    remaining -= itemsInRing;
    ringIndex++;
  }
  
  return rings;
}

export function calculateIconPositions(
  itemCount: number,
  anchor: AnchorPosition,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): RingPosition[] {
  const positions: RingPosition[] = [];
  const ringDistribution = calculateRingDistribution(itemCount);
  
  for (let ring = 0; ring < ringDistribution.length; ring++) {
    const itemsInRing = ringDistribution[ring];
    const ringRadius = config.baseRadius + ring * config.ringSpacing;
    
    for (let i = 0; i < itemsInRing; i++) {
      const t = (i + 0.5) / itemsInRing;
      let x: number;
      let y: number;
      let angle: number;
      
      switch (anchor) {
        case "bottom-right":
          angle = Math.PI - (Math.PI / 2) * t;
          x = -Math.abs(Math.cos(angle) * ringRadius);
          y = -Math.abs(Math.sin(angle) * ringRadius);
          break;
        case "bottom-left":
          angle = (Math.PI / 2) * t;
          x = Math.abs(Math.cos(angle) * ringRadius);
          y = -Math.abs(Math.sin(angle) * ringRadius);
          break;
        case "mid-left":
          angle = Math.PI + (Math.PI / 2) * t;
          x = Math.abs(Math.cos(angle) * ringRadius);
          y = Math.sin(angle) * ringRadius;
          break;
        case "mid-right":
          angle = Math.PI + (Math.PI / 2) * t;
          x = -Math.abs(Math.cos(angle) * ringRadius);
          y = Math.sin(angle) * ringRadius;
          break;
        default:
          angle = Math.PI - (Math.PI / 2) * t;
          x = -Math.abs(Math.cos(angle) * ringRadius);
          y = -Math.abs(Math.sin(angle) * ringRadius);
      }
      
      positions.push({
        x,
        y,
        angle,
        ring,
        indexInRing: i,
      });
    }
  }
  
  return positions;
}

export function getMaxRadius(
  itemCount: number,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): number {
  const ringDistribution = calculateRingDistribution(itemCount);
  const maxRing = ringDistribution.length;
  return config.baseRadius + (maxRing - 1) * config.ringSpacing;
}

export function getMenuSize(
  itemCount: number,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): number {
  const maxRadius = getMaxRadius(itemCount, config);
  return maxRadius + config.iconContainerSize / 2 + 20;
}

export function getClampedMenuSize(
  itemCount: number,
  anchor: AnchorPosition,
  screenWidth: number,
  screenHeight: number,
  triggerSize: number,
  insets: { top: number; bottom: number; left: number; right: number },
  padding: number = 16,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): { menuSize: number; scale: number } {
  const triggerHalf = triggerSize / 2;
  const baseMenuSize = getMenuSize(itemCount, config);

  const availableWidth = Math.max(
    0,
    screenWidth - insets.left - insets.right - 2 * padding - triggerHalf,
  );
  const availableHeight = Math.max(
    0,
    screenHeight - insets.top - insets.bottom - 2 * padding - triggerHalf,
  );
  
  const maxAvailable = Math.max(Math.min(availableWidth, availableHeight), 0);
  const clampedSize = Math.min(baseMenuSize, maxAvailable);
  const scale = baseMenuSize > 0 ? Math.min(clampedSize / baseMenuSize, 1) : 1;
  
  return { menuSize: Math.max(clampedSize, 80), scale };
}

export function calculateScaledIconPositions(
  itemCount: number,
  anchor: AnchorPosition,
  scale: number = 1,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): RingPosition[] {
  const positions = calculateSpiralPositions(itemCount, anchor, config);
  
  if (scale >= 1) {
    return positions;
  }
  
  return positions.map(pos => ({
    ...pos,
    x: pos.x * scale,
    y: pos.y * scale,
  }));
}

export function calculateCenteredIconPositions(
  itemCount: number,
  scale: number = 1,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): RingPosition[] {
  const ringDistribution = calculateRingDistribution(itemCount);
  const positions: RingPosition[] = [];

  for (let ring = 0; ring < ringDistribution.length; ring++) {
    const itemsInRing = ringDistribution[ring];
    const ringRadius = config.baseRadius + ring * config.ringSpacing;
    const angleStep = (2 * Math.PI) / itemsInRing;

    for (let i = 0; i < itemsInRing; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;

      positions.push({ x, y, angle, ring, indexInRing: i });
    }
  }

  if (scale >= 1) {
    return positions;
  }

  return positions.map((pos) => ({
    ...pos,
    x: pos.x * scale,
    y: pos.y * scale,
  }));
}

export function getTriggerPositionStyle(
  anchor: AnchorPosition,
  triggerSize: number,
  insets: { top: number; bottom: number; left: number; right: number },
  padding: number = 16,
  screenWidth?: number,
  screenHeight?: number
): { top?: number; bottom?: number; left?: number; right?: number } {
  const bottomPos = insets.bottom + padding;

  switch (anchor) {
    case "bottom-right":
      return { bottom: bottomPos, right: padding };
    case "bottom-left":
      return { bottom: bottomPos, left: padding };
    case "bottom-center":
      if (screenWidth) {
        return { bottom: bottomPos, left: (screenWidth - triggerSize) / 2 };
      }
      return { bottom: bottomPos, right: padding };
    case "mid-left":
      return { left: padding, top: (screenHeight ?? 0) / 2 - triggerSize / 2 };
    case "mid-right":
      return { right: padding, top: (screenHeight ?? 0) / 2 - triggerSize / 2 };
    default:
      return { bottom: bottomPos, right: padding };
  }
}

export function getMenuPositionStyle(
  anchor: AnchorPosition,
  _menuSize: number,
  triggerSize: number,
  insets: { top: number; bottom: number; left: number; right: number },
  padding: number = 16,
  screenWidth?: number,
  screenHeight?: number
): { top?: number; bottom?: number; left?: number; right?: number } {
  const triggerHalf = triggerSize / 2;
  const bottomPos = insets.bottom + padding + triggerHalf;
  
  switch (anchor) {
    case "bottom-right":
      return {
        bottom: bottomPos,
        right: padding + triggerHalf,
      };
    case "bottom-left":
      return {
        bottom: bottomPos,
        left: padding + triggerHalf,
      };
    case "bottom-center":
      if (screenWidth) {
        return {
          bottom: bottomPos,
          left: screenWidth / 2,
        };
      }
      return {
        bottom: bottomPos,
        right: padding + triggerHalf,
      };
    case "mid-left":
      return {
        left: padding + triggerHalf,
        top: (screenHeight ?? 0) / 2,
      };
    case "mid-right":
      return {
        right: padding + triggerHalf,
        top: (screenHeight ?? 0) / 2,
      };
    default:
      return {
        bottom: bottomPos,
        right: padding + triggerHalf,
      };
  }
}

export function getIconAnchorStyle(
  anchor: AnchorPosition,
  menuSize: number,
  triggerSize: number
): { top?: number; bottom?: number; left?: number; right?: number } {
  const center = menuSize / 2;
  return {
    left: center,
    top: center,
  };
}

export function getCenteredMenuPositionStyle(
  menuSize: number,
  screenWidth: number,
  screenHeight: number,
  insets: { top: number; bottom: number; left: number; right: number },
  padding: number = 16,
): { top: number; left: number } {
  const availableWidth = screenWidth - insets.left - insets.right;
  const availableHeight = screenHeight - insets.top - insets.bottom;

  const left =
    insets.left + padding + Math.max(0, (availableWidth - 2 * padding - menuSize) / 2);
  const top =
    insets.top + padding + Math.max(0, (availableHeight - 2 * padding - menuSize) / 2);

  return { top, left };
}
