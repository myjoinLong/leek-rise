export interface MapOffset {
  x: number;
  y: number;
}

export interface MapSize {
  width: number;
  height: number;
}

export interface MapRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function mapPanLimit(viewport: MapSize, map: MapSize): MapOffset {
  return {
    x: Math.max(0, (map.width - viewport.width) / 2),
    y: Math.max(0, (map.height - viewport.height) / 2),
  };
}

export function clampMapOffset(offset: MapOffset, limit: MapOffset): MapOffset {
  return {
    x: limit.x === 0 ? 0 : Math.max(-limit.x, Math.min(limit.x, offset.x)),
    y: limit.y === 0 ? 0 : Math.max(-limit.y, Math.min(limit.y, offset.y)),
  };
}

export function mapOffsetToReveal(
  target: MapRect,
  viewport: MapRect,
  current: MapOffset,
  limit: MapOffset,
  margin = 12,
): MapOffset {
  let x = current.x;
  let y = current.y;

  if (target.left < viewport.left + margin) x += viewport.left + margin - target.left;
  else if (target.right > viewport.right - margin) x += viewport.right - margin - target.right;

  if (target.top < viewport.top + margin) y += viewport.top + margin - target.top;
  else if (target.bottom > viewport.bottom - margin) y += viewport.bottom - margin - target.bottom;

  return clampMapOffset({ x, y }, limit);
}

export class MapCameraController {
  private offset: MapOffset = { x: 0, y: 0 };
  private dragPointerId: number | null = null;
  private dragStart: { x: number; y: number; offset: MapOffset } | null = null;

  constructor(
    private readonly screen: HTMLElement,
    private readonly worldPlane: HTMLElement,
    private readonly modal: HTMLElement,
  ) {
    this.bindEvents();
    this.applyOffset(this.offset);
  }

  destroy(): void {
    this.stopDrag();
    window.removeEventListener('resize', this.onResize);
    this.screen.removeEventListener('focusin', this.onFocus);
    this.worldPlane.removeEventListener('pointerdown', this.onPointerDown);
    this.worldPlane.removeEventListener('pointermove', this.onPointerMove);
    this.worldPlane.removeEventListener('pointerup', this.onPointerEnd);
    this.worldPlane.removeEventListener('pointercancel', this.onPointerEnd);
    this.worldPlane.removeEventListener('lostpointercapture', this.onLostPointerCapture);
  }

  private bindEvents(): void {
    this.worldPlane.addEventListener('pointerdown', this.onPointerDown);
    this.worldPlane.addEventListener('pointermove', this.onPointerMove);
    this.worldPlane.addEventListener('pointerup', this.onPointerEnd);
    this.worldPlane.addEventListener('pointercancel', this.onPointerEnd);
    this.worldPlane.addEventListener('lostpointercapture', this.onLostPointerCapture);
    this.screen.addEventListener('focusin', this.onFocus);
    window.addEventListener('resize', this.onResize);
  }

  private mapLimit(): MapOffset {
    return mapPanLimit(
      { width: this.screen.clientWidth, height: this.screen.clientHeight },
      { width: this.worldPlane.offsetWidth, height: this.worldPlane.offsetHeight },
    );
  }

  private applyOffset(offset: MapOffset): MapOffset {
    this.offset = clampMapOffset(offset, this.mapLimit());
    this.worldPlane.style.setProperty('--dt-pan-x', this.offset.x + 'px');
    this.worldPlane.style.setProperty('--dt-pan-y', this.offset.y + 'px');
    return this.offset;
  }

  private onPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!this.modal.hidden || event.button !== 0 || !(target instanceof Element)
      || target.closest('button, a, input, textarea, select, [role="dialog"]')) return;
    const limit = this.mapLimit();
    if (limit.x === 0 && limit.y === 0) return;
    this.dragPointerId = event.pointerId;
    this.dragStart = { x: event.clientX, y: event.clientY, offset: this.offset };
    this.worldPlane.dataset.panning = 'true';
    this.worldPlane.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.dragPointerId !== event.pointerId || !this.dragStart) return;
    const deltaX = event.clientX - this.dragStart.x;
    const deltaY = event.clientY - this.dragStart.y;
    this.applyOffset({ x: this.dragStart.offset.x + deltaX, y: this.dragStart.offset.y + deltaY });
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) event.preventDefault();
  };

  private onPointerEnd = (event: PointerEvent): void => {
    if (this.dragPointerId !== event.pointerId) return;
    this.stopDrag();
  };

  private onLostPointerCapture = (event: PointerEvent): void => {
    if (this.dragPointerId === event.pointerId) this.stopDrag();
  };

  private onFocus = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('.dt-hotspot, .dt-gate')) return;
    const toRect = (rect: DOMRect): MapRect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    this.applyOffset(mapOffsetToReveal(
      toRect(target.getBoundingClientRect()),
      toRect(this.screen.getBoundingClientRect()),
      this.offset,
      this.mapLimit(),
    ));
  };

  private onResize = (): void => { this.applyOffset(this.offset); };

  private stopDrag(): void {
    const pointerId = this.dragPointerId;
    this.dragPointerId = null;
    this.dragStart = null;
    delete this.worldPlane.dataset.panning;
    if (pointerId !== null && this.worldPlane.hasPointerCapture(pointerId)) {
      this.worldPlane.releasePointerCapture(pointerId);
    }
  }
}
