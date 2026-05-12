// Minimal browser-API stubs required for pdfjs-dist (used transitively via
// pdf-parse) to load under Node. pdfjs-dist v5 references DOMMatrix/Path2D/
// ImageData at module evaluation time; without these globals the require()
// throws "ReferenceError: DOMMatrix is not defined" and the backend exits
// before Nest can start.
//
// We do NOT render PDFs server-side — pdf-parse only extracts info/text —
// so these stubs never need to do real work. They exist solely to satisfy
// the eager identifier lookups inside pdfjs-dist.
//
// IMPORTANT: this file must be imported before any module that (directly or
// transitively) loads pdfjs-dist. See main.ts.

const g = globalThis as Record<string, unknown>;

if (typeof g.DOMMatrix === 'undefined') {
  class DOMMatrixStub {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: unknown) {}
    multiply() { return this; }
    multiplySelf() { return this; }
    translate() { return this; }
    translateSelf() { return this; }
    scale() { return this; }
    scaleSelf() { return this; }
    rotate() { return this; }
    rotateSelf() { return this; }
    invertSelf() { return this; }
    inverse() { return this; }
    transformPoint(p: unknown) { return p; }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
  }
  g.DOMMatrix = DOMMatrixStub;
}

if (typeof g.Path2D === 'undefined') {
  class Path2DStub {
    constructor(_init?: unknown) {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
    roundRect() {}
  }
  g.Path2D = Path2DStub;
}

if (typeof g.ImageData === 'undefined') {
  class ImageDataStub {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace = 'srgb';
    constructor(arg1: number | Uint8ClampedArray, arg2: number, arg3?: number) {
      if (typeof arg1 === 'number') {
        this.width = arg1;
        this.height = arg2;
        this.data = new Uint8ClampedArray(arg1 * arg2 * 4);
      } else {
        this.data = arg1;
        this.width = arg2;
        this.height = arg3 ?? arg1.length / (4 * arg2);
      }
    }
  }
  g.ImageData = ImageDataStub;
}
