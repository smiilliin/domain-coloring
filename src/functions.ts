import { Complex, complexCos, complexPow, complexSin, pow } from "./complex";

class Condition {
  value: Complex;

  constructor(value?: Complex) {
    this.value = value || new Complex(0, 0);
  }
  setValue(value: Complex) {
    this.value = value;
  }
}
class Coefficient {
  constant: Complex;
  conditions: Condition[];
  functions: MathFunction[];

  constructor(constant?: Complex) {
    this.constant = constant == undefined ? new Complex(1, 0) : constant;
    this.conditions = [];
    this.functions = [];
  }
  isConstant() {
    return this.conditions.length == 0 && this.functions.length == 0;
  }
  getValue(x: Complex) {
    return this.constant
      .mul(
        this.conditions.reduce(
          (prev, current) => prev.mul(current.value),
          new Complex(1, 0)
        )
      )
      .mul(
        this.functions.reduce(
          (prev, current) => prev.mul(current.getValue(x)),
          new Complex(1, 0)
        )
      );
  }
  addConstant(x: Complex) {
    this.constant.set(this.constant.mul(x));
  }
  addCondition(condition: Condition) {
    this.conditions.push(condition);
  }
  addFunction(f: MathFunction) {
    this.functions.push(f.clone());
  }
  clone() {
    const newCoefficient = new Coefficient();
    newCoefficient.constant = this.constant;
    newCoefficient.conditions = [...this.conditions];
    newCoefficient.functions = [...this.functions];
    return newCoefficient;
  }
}

enum FunctionType {
  Null,
  Polynominal,
  IRRationalFunction,
  FractionFunction,
  ExponentialFunction,
  SinFunction,
  CosFunction,
  TanFunction,
}
class MathFunction {
  type: FunctionType;
  constructor(type?: FunctionType) {
    this.type = type || FunctionType.Null;
  }
  getValue(x: Complex) {
    return x;
  }
  isConstant() {
    return false;
  }
  clone() {
    return new MathFunction(this.type);
  }
}
class PolynomialFunction extends MathFunction {
  terms: Map<number, Coefficient[]>;

  constructor() {
    super(FunctionType.Polynominal);
    this.terms = new Map();
  }
  clone() {
    const newFunction = new PolynomialFunction();
    this.terms.forEach((coefficients, term) => {
      newFunction.terms.set(
        term,
        coefficients.map((coefficient) => coefficient.clone())
      );
    });

    return newFunction;
  }
  isConstant() {
    if (this.terms.size == 0) return true;
    if (this.terms.get(0)?.length == 0) return true;

    return (
      (this.terms.size == 1 &&
        this.terms.get(0)?.length == 1 &&
        this.terms.get(0)?.[0].isConstant()) ||
      false
    );
  }
  getValue(x: Complex) {
    const y = new Complex(0, 0);
    this.terms.forEach((coefficients, degree) => {
      y.set(
        y.add(
          coefficients
            .reduce(
              (prev, coefficient) => prev.add(coefficient.getValue(x)),
              new Complex(0, 0)
            )
            .mul(degree == 0 ? new Complex(1) : pow(x, degree))
        )
      );
    });
    return y;
  }
  add(degree: number, coefficient: Coefficient) {
    const currentCoefficient = this.terms.get(degree);
    if (!currentCoefficient) {
      this.terms.set(degree, [coefficient.clone()]);
    } else if (
      coefficient.isConstant() &&
      currentCoefficient.length == 1 &&
      currentCoefficient[0].isConstant()
    ) {
      currentCoefficient[0].constant.set(
        currentCoefficient[0].constant.add(coefficient.constant)
      );
    } else {
      currentCoefficient.push(coefficient.clone());
    }
  }
  mul(degree: number, coefficient: Coefficient) {
    if (degree != 0) {
      const newTerms = new Map();

      this.terms.forEach((currentCoefficients, currentTerm) => {
        newTerms.set(currentTerm + degree, currentCoefficients);
      });
      this.terms = newTerms;
    }

    this.terms.forEach((currentCoefficients) => {
      currentCoefficients.forEach((currentCoefficient) => {
        coefficient.conditions.forEach((condition) =>
          currentCoefficient.addCondition(condition)
        );
        currentCoefficient.addConstant(coefficient.constant);
        coefficient.functions.forEach((f) => currentCoefficient.addFunction(f));
      });
    });
  }
}
class IRRationalFunction extends MathFunction {
  innerFunction: MathFunction;

  constructor() {
    super(FunctionType.IRRationalFunction);
    this.innerFunction = new MathFunction();
  }
  clone() {
    const newFunction = new IRRationalFunction();
    newFunction.innerFunction = this.innerFunction.clone();

    return newFunction;
  }
  isConstant() {
    return this.innerFunction.isConstant();
  }
  setInnerFunction(innerFunction: MathFunction) {
    this.innerFunction = innerFunction.clone();
  }
  getValue(x: Complex) {
    return pow(this.innerFunction.getValue(x), 1 / 2);
  }
}
class FractionFunction extends MathFunction {
  denominatorFunction: MathFunction;
  numeratorFunction: MathFunction;

  constructor() {
    super(FunctionType.FractionFunction);
    this.denominatorFunction = new MathFunction();
    this.numeratorFunction = new MathFunction();
  }
  clone() {
    const newFunction = new FractionFunction();
    newFunction.denominatorFunction = this.denominatorFunction.clone();
    newFunction.numeratorFunction = this.numeratorFunction.clone();
    return newFunction;
  }
  isConstant() {
    return (
      this.denominatorFunction.isConstant() &&
      this.numeratorFunction.isConstant()
    );
  }
  setDenominatorFunction(f: MathFunction) {
    this.denominatorFunction = f.clone();
  }
  setNumeratorFunction(f: MathFunction) {
    this.numeratorFunction = f.clone();
  }
  getValue(x: Complex) {
    return this.numeratorFunction
      .getValue(x)
      .div(this.denominatorFunction.getValue(x));
  }
}
class ExponentialFunction extends MathFunction {
  baseFunction: MathFunction;
  exponentFunction: MathFunction;

  constructor() {
    super(FunctionType.ExponentialFunction);
    this.baseFunction = new MathFunction();
    this.exponentFunction = new MathFunction();
  }
  clone() {
    const newFunction = new ExponentialFunction();
    newFunction.baseFunction = this.baseFunction.clone();
    newFunction.exponentFunction = this.exponentFunction.clone();
    return newFunction;
  }
  isConstant() {
    return this.baseFunction.isConstant() && this.exponentFunction.isConstant();
  }
  setBaseFunction(f: MathFunction) {
    this.baseFunction = f.clone();
  }
  setExponentFunction(f: MathFunction) {
    this.exponentFunction = f.clone();
  }
  getValue(x: Complex) {
    const base = this.baseFunction.getValue(x);
    const exponent = this.exponentFunction.getValue(x);

    return complexPow(base, exponent);
  }
}
class SinFunction extends MathFunction {
  thetaFunction: MathFunction;

  constructor() {
    super(FunctionType.SinFunction);
    this.thetaFunction = new MathFunction();
  }
  clone() {
    const newFunction = new SinFunction();
    newFunction.thetaFunction = this.thetaFunction.clone();
    return newFunction;
  }
  isConstant() {
    return this.thetaFunction.isConstant();
  }
  setThetaFunction(f: MathFunction) {
    this.thetaFunction = f.clone();
  }
  getValue(x: Complex) {
    const theta = this.thetaFunction.getValue(x);
    return complexSin(theta);
  }
}
class CosFunction extends MathFunction {
  thetaFunction: MathFunction;

  constructor() {
    super(FunctionType.CosFunction);
    this.thetaFunction = new MathFunction();
  }
  clone() {
    const newFunction = new CosFunction();
    newFunction.thetaFunction = this.thetaFunction.clone();
    return newFunction;
  }
  isConstant() {
    return this.thetaFunction.isConstant();
  }
  setThetaFunction(f: MathFunction) {
    this.thetaFunction = f.clone();
  }
  getValue(x: Complex) {
    const theta = this.thetaFunction.getValue(x);
    return complexCos(theta);
  }
}
class TanFunction extends MathFunction {
  thetaFunction: MathFunction;

  constructor() {
    super(FunctionType.TanFunction);
    this.thetaFunction = new MathFunction();
  }
  clone() {
    const newFunction = new TanFunction();
    newFunction.thetaFunction = this.thetaFunction.clone();
    return newFunction;
  }
  isConstant() {
    return this.thetaFunction.isConstant();
  }
  setThetaFunction(f: MathFunction) {
    this.thetaFunction = f.clone();
  }
  getValue(x: Complex) {
    const theta = this.thetaFunction.getValue(x);
    return complexSin(theta).div(complexCos(theta));
  }
}
const functionToCoefficient = (f: MathFunction) => {
  const coefficient = new Coefficient();
  coefficient.functions.push(f);
  return coefficient;
};

export {
  Condition,
  Coefficient,
  FunctionType,
  functionToCoefficient,
  MathFunction,
  PolynomialFunction,
  IRRationalFunction,
  FractionFunction,
  ExponentialFunction,
  SinFunction,
  CosFunction,
  TanFunction,
};
