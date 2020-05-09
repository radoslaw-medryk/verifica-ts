import { PredicateIBase } from "./PredicateIBase";
import { PredicateI } from "./PredicateI";

export type ArrayPredicateI = PredicateIBase & {
  type: "array";
  of: PredicateI;
};
