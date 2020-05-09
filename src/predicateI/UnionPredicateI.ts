import { PredicateIBase } from "./PredicateIBase";
import { PredicateI } from "./PredicateI";

export type UnionPredicateI = PredicateIBase & {
  type: "union";
  types: PredicateI[];
};
