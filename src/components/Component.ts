export interface Component<S> {
  el: HTMLElement;
  update(state: S): void;
  destroy?(): void;
}