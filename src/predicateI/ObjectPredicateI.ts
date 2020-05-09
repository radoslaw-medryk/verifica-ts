import { PredicateI } from "./PredicateI";
import { PredicateIBase } from "./PredicateIBase";

export type ObjectPredicateI = PredicateIBase & {
  type: "object";
  props: { name: string; predicate: PredicateI }[];
};
