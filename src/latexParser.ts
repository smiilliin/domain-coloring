import { Complex, I } from "./complex";
import conditions from "./conditions";
import {
  Coefficient,
  Condition,
  CosFunction,
  ExponentialFunction,
  FractionFunction,
  IRRationalFunction,
  PolynomialFunction,
  SinFunction,
  TanFunction,
} from "./functions";

const symbolList = ["sin", "cos", "tan", "theta", "pi"];
const specialExponentList = ["sin", "cos", "tan"];
function findSymbol(slicedTerm: string, symbolName: string) {
  if (
    new RegExp(
      `(?:^\\\\${symbolName}[\\s|{|(|\\*|0-9]|^\\\\${symbolName}$)`
    ).test(slicedTerm)
  ) {
    return 1 + symbolName.length;
  }
  return null;
}
function findExponents(term: string) {
  let openCount = 0;

  openCount = 0;

  const mathFunctions = [];

  for (let i = 0; i < term.length; i++) {
    if (term[i] == "(" || term[i] == "{") {
      openCount++;
    } else if (term[i] == ")" || term[i] == "}") {
      openCount--;
    } else if (term[i] == "^" && openCount == 0) {
      if (i == 0 || i == term.length - 1) continue;

      const front = term.slice(0, i);
      const back = term.slice(i + 1);

      let base = "";
      let exponent = "";
      let startIndex = -1;
      let endIndex = -1;

      if (/\)\s*$/.test(front)) {
        //reverse string
        const findResult = findParentheses(
          front.split("").reverse().join(""),
          ")",
          "("
        );

        if (!findResult) break;

        const { data, length } = findResult;
        base = data.split("").reverse().join("");
        startIndex = i - 1 - (length - 1);
      } else {
        //non-bracket base
        const regexResult = /(.|\\.*)\s*$/.exec(front);
        if (!regexResult || !regexResult[1]) break;

        if (
          regexResult[1].length != 1 &&
          symbolList.indexOf(regexResult[1].slice(1)) == -1
        ) {
          break;
        }

        base = regexResult[1];
        startIndex = i - 1 - (regexResult[0].length - 1);
      }

      if (/^\s*{/.test(back)) {
        const findResult = findParentheses(back, "{", "}");
        if (!findResult) break;

        const { data, length } = findResult;
        exponent = data;

        endIndex = i + 1 + length - 1;
      } else {
        //non-bracket exponent
        const regexResult = /^\s*(\\[^\s][a-zA-Z]*|.)/.exec(back);
        if (!regexResult || !regexResult[1]) break;

        if (
          regexResult[1].length != 1 &&
          symbolList.indexOf(regexResult[1].slice(1)) == -1
        ) {
          break;
        }

        exponent = regexResult[1];

        endIndex = i + 1 + regexResult[0].length - 1;
      }

      if (specialExponentList.indexOf(base.slice(1)) != -1) {
        base = base + " " + term.slice(endIndex + 1);
        endIndex = term.length - 1;
      }

      const baseFunction = parsePolynomial(base);
      const exponentFunction = parsePolynomial(exponent);

      const f = new ExponentialFunction();
      f.setBaseFunction(baseFunction);
      f.setExponentFunction(exponentFunction);
      mathFunctions.push(f);

      term = term.slice(0, startIndex) + term.slice(endIndex + 1);
      i = startIndex - 1;
      continue;
    }
  }
  return { term: term, mathFunctions: mathFunctions };
}
function splitTerms(terms: string) {
  let openCount = 0;
  const result = [];

  for (let i = 0; i < terms.length; i++) {
    if (terms[i] == "(" || terms[i] == "{") {
      openCount++;
    } else if (terms[i] == ")" || terms[i] == "}") {
      openCount--;
    } else if (terms[i] == "+" && openCount == 0) {
      result.push(terms.slice(0, i));
      terms = terms.slice(i + 1);
      i = -1;
      continue;
    }
  }
  result.push(terms);

  return result;
}
function hasFunctionName(slicedTerm: string, name: string) {
  return new RegExp(`^\\\\${name}[\\s|{|(|0-9]`).test(slicedTerm);
}
function findArgument(
  slicedTerm: string,
  name: string,
  argumentCount: number,
  startShape: string = "{",
  endShape: string = "}"
) {
  const args = [];
  let length = 0;

  if (hasFunctionName(slicedTerm, name)) {
    let currentIndex = slicedTerm.indexOf(startShape);
    if (currentIndex == -1) return null;

    for (let j = 0; j < argumentCount; j++) {
      const startIndex = currentIndex + 1;
      let openCounter = 0;

      for (; currentIndex != slicedTerm.length; currentIndex++) {
        if (slicedTerm[currentIndex] == startShape) {
          openCounter++;
        }
        if (slicedTerm[currentIndex] == endShape) {
          openCounter--;
        }

        if (openCounter == 0) {
          args.push(slicedTerm.slice(startIndex, currentIndex));
          length += currentIndex + 1;
          break;
        }
      }
      if (j == argumentCount - 1) break;

      const oldCurrentIndex = currentIndex;
      currentIndex = slicedTerm.slice(currentIndex).indexOf("{") + currentIndex;
      if (currentIndex < oldCurrentIndex) return null;
      slicedTerm = slicedTerm.slice(currentIndex);
      currentIndex = 0;
    }
  }

  if (args.length != argumentCount) {
    return null;
  } else {
    return { args: args, length: length };
  }
}
function findParentheses(
  slicedTerm: string,
  startShape: string = "(",
  endShape: string = ")"
) {
  let data = "";
  let length = 0;

  let currentIndex = slicedTerm.indexOf(startShape);
  if (currentIndex == -1) return null;

  const startIndex = currentIndex + 1;
  let openCounter = 0;

  for (; currentIndex != slicedTerm.length; currentIndex++) {
    if (slicedTerm[currentIndex] == startShape) {
      openCounter++;
    }
    if (slicedTerm[currentIndex] == endShape) {
      openCounter--;
    }

    if (openCounter == 0) {
      data = slicedTerm.slice(startIndex, currentIndex);
      length += currentIndex + 1;
      break;
    }
  }

  if (length > 2) {
    return { data: data, length: length };
  } else {
    return null;
  }
}
function parseTerm(term: string) {
  let coefficient = new Coefficient();
  let degree = 0;
  let isEmpty = true;

  const { term: newTerm, mathFunctions } = findExponents(term);

  term = newTerm;
  mathFunctions.forEach((f) => {
    if (f.isConstant()) {
      coefficient.addConstant(f.getValue(new Complex(0)));
    } else {
      coefficient.addFunction(f);
    }
  });

  isEmpty = mathFunctions.length == 0;

  for (let i = 0; i < term.length; i++) {
    const currentChar = term[i];
    if (currentChar == "\\") {
      const slicedTerm = term.slice(i);
      let parsedArguments;

      parsedArguments = findArgument(slicedTerm, "frac", 2);

      if (parsedArguments) {
        const { args, length } = parsedArguments;
        const denominator = args[1];
        const numerator = args[0];
        const denominatorFunction = parsePolynomial(denominator);
        const numeratorFunction = parsePolynomial(numerator);
        const fractionFunction = new FractionFunction();
        fractionFunction.setDenominatorFunction(denominatorFunction);
        fractionFunction.setNumeratorFunction(numeratorFunction);

        if (fractionFunction.isConstant()) {
          coefficient.addConstant(fractionFunction.getValue(new Complex(0)));
        } else {
          coefficient.addFunction(fractionFunction);
        }

        i += length - 1;

        isEmpty = false;
        continue;
      }
      parsedArguments = findArgument(slicedTerm, "sqrt", 1);

      if (parsedArguments) {
        const { args, length } = parsedArguments;
        const inner = args[0];
        const innerFunction = parsePolynomial(inner);
        const irrationalFunction = new IRRationalFunction();
        irrationalFunction.setInnerFunction(innerFunction);

        if (irrationalFunction.isConstant()) {
          coefficient.addConstant(irrationalFunction.getValue(new Complex(0)));
        } else {
          coefficient.addFunction(irrationalFunction);
        }

        i += length - 1;

        isEmpty = false;
        continue;
      }
      if (hasFunctionName(slicedTerm, "sin")) {
        parsedArguments = findArgument(slicedTerm, "sin", 1, "(", ")");
        let theta;

        if (parsedArguments) {
          const { args, length } = parsedArguments;

          theta = args[0];
          i += length - 1;
        } else {
          //\sin
          theta = slicedTerm.slice(4);
          i += slicedTerm.length - 1;
        }

        const thetaFunction = parsePolynomial(theta);

        const sinFunction = new SinFunction();
        sinFunction.setThetaFunction(thetaFunction);

        if (sinFunction.isConstant()) {
          coefficient.addConstant(sinFunction.getValue(new Complex(0)));
        } else {
          coefficient.addFunction(sinFunction);
        }

        isEmpty = false;
        continue;
      }
      if (hasFunctionName(slicedTerm, "cos")) {
        parsedArguments = findArgument(slicedTerm, "cos", 1, "(", ")");
        let theta;

        if (parsedArguments) {
          const { args, length } = parsedArguments;

          theta = args[0];
          i += length - 1;
        } else {
          //\cos
          theta = slicedTerm.slice(4);
          i += slicedTerm.length - 1;
        }

        const thetaFunction = parsePolynomial(theta);

        const cosFunction = new CosFunction();
        cosFunction.setThetaFunction(thetaFunction);

        if (cosFunction.isConstant()) {
          coefficient.addConstant(cosFunction.getValue(new Complex(0)));
        } else {
          coefficient.addFunction(cosFunction);
        }

        isEmpty = false;
        continue;
      }
      if (hasFunctionName(slicedTerm, "tan")) {
        parsedArguments = findArgument(slicedTerm, "tan", 1, "(", ")");
        let theta;

        if (parsedArguments) {
          const { args, length } = parsedArguments;

          theta = args[0];
          i += length - 1;
        } else {
          //\tan
          theta = slicedTerm.slice(4);
          i += slicedTerm.length - 1;
        }

        const thetaFunction = parsePolynomial(theta);

        const tanFunction = new TanFunction();
        tanFunction.setThetaFunction(thetaFunction);

        if (tanFunction.isConstant()) {
          coefficient.addConstant(tanFunction.getValue(new Complex(0)));
        } else {
          coefficient.addFunction(tanFunction);
        }

        isEmpty = false;
        continue;
      }

      let length;
      if ((length = findSymbol(slicedTerm, "theta")) != null) {
        coefficient.addCondition(conditions.get("theta") as Condition);
        term = term.slice(0, i) + term.slice(i + length - 1 + 1);
        i--;

        isEmpty = false;
        continue;
      }
      if ((length = findSymbol(slicedTerm, "pi")) != null) {
        coefficient.addConstant(new Complex(Math.PI));
        term = term.slice(0, i) + term.slice(i + length - 1 + 1);
        i--;

        isEmpty = false;
        continue;
      }
    } else if (currentChar == "(" || currentChar == "{") {
      const slicedTerm = term.slice(i);

      const parsedParentheses = findParentheses(
        slicedTerm,
        currentChar,
        currentChar == "(" ? ")" : "}"
      );

      if (parsedParentheses) {
        const { data, length } = parsedParentheses;

        const f = parsePolynomial(data);
        if (f.isConstant()) {
          coefficient.addConstant(f.terms.get(0)?.[0].constant as Complex);
        } else {
          coefficient.addFunction(f);
        }
        i += length - 1;
        isEmpty = false;
        continue;
      }
    } else {
      if (currentChar == "z") {
        degree++;
        isEmpty = false;
      } else if (currentChar == "-") {
        coefficient.addConstant(new Complex(-1));
      } else if (/^[0-9]/.test(currentChar)) {
        const slicedTerm = term.slice(i);
        const numberRegex = /^[0-9]+(?:\.[0-9]*)?/;
        const regexResult = numberRegex.exec(slicedTerm);

        if (regexResult) {
          coefficient.addConstant(new Complex(Number(regexResult[0])));
          i += regexResult[0].length - 1;
          isEmpty = false;
        }
      } else if (currentChar == "e") {
        coefficient.addConstant(new Complex(Math.E));
        isEmpty = false;
      } else if (currentChar == "i") {
        coefficient.addConstant(I);
        isEmpty = false;
      } else {
        const condition = conditions.get(currentChar);

        if (condition) {
          coefficient.addCondition(condition);
          isEmpty = false;
        }
      }
    }
  }
  if (isEmpty) {
    coefficient = new Coefficient(new Complex(0));
  }
  return { degree: degree, coefficient: coefficient };
}

function parsePolynomial(polynominalLatex: string) {
  const terms = splitTerms(polynominalLatex);

  const polynomialFunction = new PolynomialFunction();

  terms.forEach((term) => {
    if (!term) return;
    const { degree, coefficient } = parseTerm(term);
    polynomialFunction.add(degree, coefficient);
  });
  return polynomialFunction;
}

export { parsePolynomial, parseTerm };
