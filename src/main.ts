import * as PIXI from "pixi.js";
import { Complex } from "./complex";
import { parsePolynomial } from "./latexParser";
import { Vector2, getMapVectorFromScreen } from "./math";
import { PolynomialFunction } from "./functions";
import conditions from "./conditions";

const app = new PIXI.Application({
  background: "#000000",
  resizeTo: document.body,
});

document.body.appendChild(app.view as HTMLCanvasElement);

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

const view = new PIXI.Container();

const fragmentSize = 15;
const chunkSize = 64;

class Chunk extends PIXI.Graphics {
  vector: Vector2;
  hidden: boolean;
  constructor(vector: Vector2) {
    super();
    this.vector = new Vector2(vector.x, vector.y);
    this.x = vector.x * fragmentSize * chunkSize;
    this.y = vector.y * fragmentSize * chunkSize;
    this.hidden = true;
  }
  update(f: PolynomialFunction) {
    if (this.hidden) return;

    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const a = (this.vector.x * chunkSize + x) / (chunkSize / 2);
        const b = (-this.vector.y * chunkSize - y) / (chunkSize / 2);
        const z = new Complex(a, b);
        const theta = Math.atan2(b, a);

        conditions.get("a")?.setValue(new Complex(a));
        conditions.get("b")?.setValue(new Complex(b));
        conditions.get("theta")?.setValue(new Complex(theta));

        const result = f.getValue(z);
        const resultTheta = Math.atan2(result.b, result.a);

        const l = (x: number) => (2 / Math.PI) * Math.atan(x);
        this.beginFill({
          h: (resultTheta / (2 * Math.PI)) * 360,
          s: 100,
          l: 100 * l(result.abs()),
        });

        this.drawRect(
          (x - 1 / 2) * fragmentSize,
          (y - 1 / 2) * fragmentSize,
          fragmentSize,
          fragmentSize
        );
        this.endFill();
      }
    }
  }
  hide(view: PIXI.Container) {
    if (this.hidden) return;
    this.hidden = true;
    this.clear();
    view.removeChild(this);
  }
  show(view: PIXI.Container, f: PolynomialFunction) {
    if (!this.hidden) return;
    this.hidden = false;
    this.update(f);
    view.addChild(this);
  }
}
class World {
  chunks: Chunk[];

  constructor() {
    this.chunks = [];
  }
  getChunk(vector: Vector2): Chunk | undefined {
    return this.chunks.find((chunk) => chunk.vector.compare(vector));
  }
  addChunk(chunk: Chunk) {
    this.chunks.push(chunk);
  }
  static toChunkVector(vector: Vector2): Vector2 {
    return new Vector2(
      Math.floor((vector.x + 1 / 2) / chunkSize),
      Math.floor((vector.y + 1 / 2) / chunkSize)
    );
  }
  update(f: PolynomialFunction) {
    this.chunks.forEach((chunk) => {
      chunk.update(f);
    });
  }
  viewMoved(view: PIXI.Container, f: PolynomialFunction) {
    const viewStartVector = getMapVectorFromScreen(new Vector2(0, 0), view)
      .div(fragmentSize)
      .div(chunkSize)
      .floor();
    const viewEndVector = getMapVectorFromScreen(
      new Vector2(app.screen.width, app.screen.height),
      view
    )
      .div(fragmentSize)
      .div(chunkSize)
      .floor();

    for (let y = viewStartVector.y; y <= viewEndVector.y; y++) {
      for (let x = viewStartVector.x; x <= viewEndVector.x; x++) {
        let chunk = this.getChunk(new Vector2(x, y));
        if (!chunk) {
          chunk = new Chunk(new Vector2(x, y));
          this.addChunk(chunk);
        }
        chunk.show(view, f);
      }
    }

    this.chunks.forEach((chunk) => {
      const chunkStartVector = chunk.vector.clone();
      const chunkEndVector = chunk.vector.add(new Vector2(1, 1));

      if (
        !(
          chunkEndVector.x >= viewStartVector.x &&
          chunkStartVector.x >= viewStartVector.x &&
          chunkEndVector.y >= viewStartVector.y &&
          chunkStartVector.y >= viewStartVector.y
        )
      ) {
        chunk.hide(view);
      }
    });
  }
}

view.x = app.screen.width / 2;
view.y = app.screen.height / 2;

app.stage.addChild(view);

const world = new World();

let f: PolynomialFunction;
let viewMovedTimeout: NodeJS.Timeout | null = null;
function viewMoved() {
  if (!viewMovedTimeout) {
    viewMovedTimeout = setTimeout(() => {
      world.viewMoved(view, f);
      viewMovedTimeout = null;
    }, 200);
  }
}

viewMoved();

let mouseHolding = false;
app.stage.on("mousedown", () => {
  mouseHolding = true;
});
app.stage.on("mousemove", (event) => {
  if (mouseHolding) {
    view.x += event.movementX;
    view.y += event.movementY;
    viewMoved();
  }
});
app.stage.on("mouseup", () => {
  mouseHolding = false;
});
window.addEventListener("resize", () => {
  viewMoved();
});
app.stage.on("wheel", (event) => {
  const oldMouse = getMapVectorFromScreen(new Vector2(event.x, event.y), view);

  view.scale.x *= 1 - event.deltaY / 1000;
  view.scale.y *= 1 - event.deltaY / 1000;

  if (view.scale.x < 0.3) {
    view.scale.x = 0.3;
    view.scale.y = 0.3;
    return;
  }
  if (view.scale.x > 2) {
    view.scale.x = 2;
    view.scale.y = 2;
  }

  const newMouse = getMapVectorFromScreen(new Vector2(event.x, event.y), view);

  const movement = newMouse.sub(oldMouse).mul(view.scale.x);

  view.x += movement.x;
  view.y += movement.y;

  viewMoved();
});
const latexInput = document.getElementById("latex-input") as HTMLInputElement;

function latexInputUpdated() {
  let latex = latexInput.value;

  latex = latex.replace(/\\times\s*/g, "* ");
  latex = latex.replace(/-/g, "+ -1 * ");

  f = parsePolynomial(latex);
}
latexInput.addEventListener("input", () => {
  latexInputUpdated();
});

const updateButton = document.getElementById(
  "update-button"
) as HTMLButtonElement;
updateButton.onclick = () => {
  world.update(f);
};
const container = document.getElementById("container") as HTMLFormElement;
container.onsubmit = (event) => event.preventDefault();

latexInputUpdated();
