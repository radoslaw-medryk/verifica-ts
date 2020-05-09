import { PredicateIBase } from "./PredicateIBase";
import { PredicateI } from "./PredicateI";

export type SymbolPredicateI = PredicateIBase & {
  type: "symbol";
  value?: PredicateI;
};
