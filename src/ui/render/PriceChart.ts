import Phaser from 'phaser';

class PriceChartScene extends Phaser.Scene {
  private graphics: Phaser.GameObjects.Graphics | undefined;
  private prices: number[] = [];
  private readonly tweenProgress = { value: 1 };

  constructor(
    private readonly chartWidth: number,
    private readonly chartHeight: number,
    private readonly pixelRatio: number,
  ) {
    super({ key: 'PriceChartScene' });
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.redraw();
  }

  setPrices(prices: number[]): void {
    const targetPrices = prices.filter((price) => Number.isFinite(price));
    if (!this.graphics) {
      this.prices = targetPrices;
      return;
    }

    this.tweens.killTweensOf(this.tweenProgress);
    if (this.prices.length === 0 || targetPrices.length === 0) {
      this.prices = targetPrices;
      this.redraw();
      return;
    }

    const startPrices = targetPrices.map((_, index) => {
      const sourcePosition = targetPrices.length === 1
        ? (this.prices.length - 1) / 2
        : index * (this.prices.length - 1) / (targetPrices.length - 1);
      const lowerIndex = Math.floor(sourcePosition);
      const lowerPrice = this.prices[lowerIndex] ?? this.prices[this.prices.length - 1] ?? 0;
      const upperPrice = this.prices[lowerIndex + 1] ?? lowerPrice;
      return lowerPrice + (upperPrice - lowerPrice) * (sourcePosition - lowerIndex);
    });
    this.tweenProgress.value = 0;
    this.tweens.add({
      targets: this.tweenProgress,
      value: 1,
      duration: 3000,
      ease: 'Linear',
      onUpdate: () => {
        this.prices = targetPrices.map((price, index) => {
          const startPrice = startPrices[index] ?? price;
          return startPrice + (price - startPrice) * this.tweenProgress.value;
        });
        this.redraw();
      },
      onComplete: () => {
        this.prices = targetPrices;
        this.redraw();
      },
    });
  }

  private redraw(): void {
    if (!this.graphics) return;

    this.graphics.clear();
    this.drawGrid();
    if (this.prices.length === 0) return;

    const finitePrices = this.prices.filter((price) => Number.isFinite(price));
    if (finitePrices.length === 0) return;

    const min = Math.min(...finitePrices);
    const max = Math.max(...finitePrices);
    const firstPrice = this.prices[0]!;
    const lastPrice = this.prices[this.prices.length - 1]!;
    const lineColor = lastPrice >= firstPrice ? 0xE85D4A : 0x3FB87A;

    this.graphics.lineStyle(1.5 * this.pixelRatio, lineColor, 1);
    this.graphics.beginPath();
    finitePrices.forEach((price, index) => {
      const x = finitePrices.length === 1
        ? this.chartWidth / 2
        : index * this.chartWidth / (finitePrices.length - 1);
      const y = max === min
        ? this.chartHeight / 2
        : (max - price) / (max - min) * this.chartHeight;

      if (index === 0) {
        this.graphics?.moveTo(x, y);
      } else {
        this.graphics?.lineTo(x, y);
      }
    });
    this.graphics.strokePath();
  }

  private drawGrid(): void {
    if (!this.graphics) return;

    this.graphics.lineStyle(this.pixelRatio, 0x262B37, 1);
    this.graphics.lineBetween(0, 0, this.chartWidth, 0);
    this.graphics.lineBetween(0, this.chartHeight / 2, this.chartWidth, this.chartHeight / 2);
    this.graphics.lineBetween(0, this.chartHeight, this.chartWidth, this.chartHeight);
  }
}

export class PriceChart {
  private readonly game: Phaser.Game;
  private readonly scene: PriceChartScene;

  constructor(parent: HTMLElement, width: number, height: number) {
    const pixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = Math.round(width * pixelRatio);
    const canvasHeight = Math.round(height * pixelRatio);

    this.scene = new PriceChartScene(canvasWidth, canvasHeight, pixelRatio);
    this.game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: canvasWidth,
      height: canvasHeight,
      parent,
      canvasStyle: `display: block; width: ${width}px; height: ${height}px;`,
      transparent: true,
      scene: this.scene,
    });
  }

  update(prices: number[]): void {
    this.scene.setPrices(prices);
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
