import { PredicateIBase } from "./PredicateIBase";
import { Predicate } from "verifica";

export type PrimitivePredicateI = PredicateIBase & {
  type: "primitive";
  predicate: Predicate<unknown>;
};
