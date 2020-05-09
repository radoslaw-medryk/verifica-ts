import { ArrayPredicateI } from "./ArrayPredicateI";
import { ObjectPredicateI } from "./ObjectPredicateI";
import { SymbolPredicateI } from "./SymbolPredicateI";
import { UnionPredicateI } from "./UnionPredicateI";
import { IntersectionPredicateI } from "./IntersectionPredicateI";
import { PrimitivePredicateI } from "./PrimitivePredicateI";

export type PredicateI =
  | ArrayPredicateI
  | ObjectPredicateI
  | SymbolPredicateI
  | UnionPredicateI
  | IntersectionPredicateI
  | PrimitivePredicateI;
