import { Complex } from "./complex";
import { Condition } from "./functions";

const conditions: Map<string, Condition> = new Map();
conditions.set("theta", new Condition(new Complex(2 * Math.PI)));
conditions.set("a", new Condition(new Complex(2)));
conditions.set("b", new Condition(new Complex(4)));

export default conditions;
