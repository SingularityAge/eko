export interface Point {
  x: number;
  y: number;
}

export class MouseEmulator {
  private currentPosition: Point = { x: 0, y: 0 };
  private isMoving = false;
  private cursorElement: HTMLDivElement | null = null;

  constructor() {
    this.updateCurrentPosition();
    this.createVisualCursor();
  }

  private createVisualCursor(): void {
    this.cursorElement = document.createElement('div');
    this.cursorElement.id = 'persona-cursor';
    this.cursorElement.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border: 2px solid #ff4444;
      border-radius: 50%;
      pointer-events: none;
      z-index: 999999;
      transition: opacity 0.2s;
      background: rgba(255, 68, 68, 0.2);
      box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
    `;
    this.cursorElement.style.display = 'none';
    document.body.appendChild(this.cursorElement);
  }

  showCursor(): void {
    if (this.cursorElement) {
      this.cursorElement.style.display = 'block';
    }
  }

  hideCursor(): void {
    if (this.cursorElement) {
      this.cursorElement.style.display = 'none';
    }
  }

  private updateCurrentPosition(): void {
    this.currentPosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  async moveToElement(element: HTMLElement): Promise<void> {
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2 + window.scrollX;
    const targetY = rect.top + rect.height / 2 + window.scrollY;

    const overshoot = Math.random() < 0.3;

    if (overshoot) {
      const overshootX = targetX + (Math.random() - 0.5) * 50;
      const overshootY = targetY + (Math.random() - 0.5) * 50;
      await this.moveTo({ x: overshootX, y: overshootY });
      await this.wait(this.randomDelay(50, 150));
      await this.moveTo({ x: targetX, y: targetY });
    } else {
      await this.moveTo({ x: targetX, y: targetY });
    }
  }

  private async moveTo(target: Point): Promise<void> {
    if (this.isMoving) return;
    this.isMoving = true;

    const waypoints = this.generateBezierPath(this.currentPosition, target, 5 + Math.floor(Math.random() * 6));

    for (let i = 0; i < waypoints.length; i++) {
      const point = waypoints[i];
      const jitteredPoint = this.addJitter(point, i, waypoints.length);

      this.dispatchMouseMove(jitteredPoint);
      this.currentPosition = jitteredPoint;

      const velocity = this.calculateVelocity(i, waypoints.length);
      await this.wait(velocity);
    }

    this.isMoving = false;
  }

  private generateBezierPath(start: Point, end: Point, numWaypoints: number): Point[] {
    const waypoints: Point[] = [];

    const control1 = {
      x: start.x + (end.x - start.x) * 0.25 + (Math.random() - 0.5) * 100,
      y: start.y + (end.y - start.y) * 0.25 + (Math.random() - 0.5) * 100,
    };

    const control2 = {
      x: start.x + (end.x - start.x) * 0.75 + (Math.random() - 0.5) * 100,
      y: start.y + (end.y - start.y) * 0.75 + (Math.random() - 0.5) * 100,
    };

    for (let i = 0; i <= numWaypoints; i++) {
      const t = i / numWaypoints;
      const point = this.cubicBezier(start, control1, control2, end, t);
      waypoints.push(point);
    }

    return waypoints;
  }

  private cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

    return { x, y };
  }

  private addJitter(point: Point, index: number, total: number): Point {
    const jitterAmount = 2;
    const perlinValue = this.perlinNoise(index / total);

    return {
      x: point.x + perlinValue * jitterAmount,
      y: point.y + this.perlinNoise((index / total) + 100) * jitterAmount,
    };
  }

  private perlinNoise(x: number): number {
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    const u = this.fade(x);

    return this.lerp(u, this.grad(this.p[X], x), this.grad(this.p[X + 1], x - 1)) * 2;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number): number {
    return (hash & 1) === 0 ? x : -x;
  }

  private p: number[] = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
    207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
    119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
    218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
    81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
    184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
    222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
  ].concat([
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
    207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
    119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
    218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
    81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
    184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
    222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
  ]);

  private calculateVelocity(index: number, total: number): number {
    const progress = index / total;

    if (progress < 0.2) {
      return this.randomDelay(30, 50);
    } else if (progress < 0.8) {
      return this.randomDelay(8, 15);
    } else {
      return this.randomDelay(20, 40);
    }
  }

  private dispatchMouseMove(point: Point): void {
    const clientX = point.x - window.scrollX;
    const clientY = point.y - window.scrollY;

    if (this.cursorElement) {
      this.cursorElement.style.left = `${clientX - 10}px`;
      this.cursorElement.style.top = `${clientY - 10}px`;
    }

    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: clientX,
      clientY: clientY,
    });

    document.elementFromPoint(clientX, clientY)?.dispatchEvent(event);
  }

  async click(element: HTMLElement): Promise<void> {
    await this.moveToElement(element);

    await this.wait(this.randomDelay(50, 150));

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const mousedown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
    });

    const mouseup = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
    });

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
    });

    element.dispatchEvent(mousedown);
    await this.wait(this.randomDelay(50, 100));
    element.dispatchEvent(mouseup);
    element.dispatchEvent(clickEvent);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
