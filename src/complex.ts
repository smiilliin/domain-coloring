class Complex {
  a: number;
  b: number;

  constructor(a: number = 0, b: number = 0) {
    this.a = a;
    this.b = b;
  }
  clone() {
    return new Complex(this.a, this.b);
  }
  set(other: Complex) {
    this.a = other.a;
    this.b = other.b;
  }
  add(other: Complex) {
    return new Complex(this.a + other.a, this.b + other.b);
  }
  sub(other: Complex) {
    return new Complex(this.a - other.a, this.b - other.b);
  }
  mul(other: Complex) {
    return new Complex(
      this.a * other.a - this.b * other.b,
      this.a * other.b + this.b * other.a
    );
  }
  div(other: Complex) {
    const denominator = other.a * other.a + other.b * other.b;
    return new Complex(
      (this.a * other.a + this.b * other.b) / denominator,
      (this.b * other.a - this.a * other.b) / denominator
    );
  }
  abs() {
    return Math.sqrt(this.a * this.a + this.b * this.b);
  }
  toString() {
    return `${this.a} + ${this.b}i`;
  }
}
const pow = (complex: Complex, x: number) => {
  if (complex.a == 0 && complex.b == 0) {
    return new Complex(0);
  }
  if (complex.b == 0 && complex.a > 0) {
    return new Complex(Math.pow(complex.a, x));
  }
  const theta = Math.atan2(complex.b, complex.a);
  const r = Math.sqrt(complex.a * complex.a + complex.b * complex.b);
  const coefficient = Math.pow(r, x);

  return new Complex(
    coefficient * Math.cos(x * theta),
    coefficient * Math.sin(x * theta)
  );
};
const complexPow = (complex: Complex, x: Complex) => {
  if (complex.a == 0 && complex.b == 0) {
    return new Complex(0);
  }
  if (complex.b == 0 && x.b == 0 && complex.a > 0) {
    return new Complex(Math.pow(complex.a, x.a));
  }
  const theta = Math.atan2(complex.b, complex.a);
  const r = Math.sqrt(complex.a * complex.a + complex.b * complex.b);
  const coefficient = Math.pow(r, x.a) * Math.exp(-x.b * theta);
  const x1 = x.b * Math.log(r) + x.a * theta;

  return new Complex(coefficient * Math.cos(x1), coefficient * Math.sin(x1));
};
const I = new Complex(0, 1);
const E = new Complex(Math.E, 0);

const complexSin = (theta: Complex) => {
  if (theta.b == 0) {
    return new Complex(Math.sin(theta.a));
  }

  return complexPow(E, theta.mul(I))
    .sub(complexPow(E, theta.mul(I).mul(new Complex(-1))))
    .div(new Complex(0, 2));
};
const complexCos = (theta: Complex) => {
  if (theta.b == 0) {
    return new Complex(Math.cos(theta.a));
  }

  return complexPow(E, theta.mul(I))
    .add(complexPow(E, theta.mul(I).mul(new Complex(-1))))
    .div(new Complex(2));
};

export { Complex, pow, complexPow, complexSin, complexCos, I, E };
