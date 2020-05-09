import { PredicateIBase } from "./PredicateIBase";
import { PredicateI } from "./PredicateI";

export type IntersectionPredicateI = PredicateIBase & {
  type: "intersection";
  types: PredicateI[];
};
