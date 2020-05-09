import { Predicate, getErrors } from "verifica";
import { Type, withType, HasMagicProperty } from "ts-materialise";
import { isPredicateIMatch } from "./isPredicateIMatch";
import { getPredicateI } from "./predicateI/getPredicateI";

type IsType = <T>(a: string, b: number) => Predicate<T>;

export const isType: IsType & HasMagicProperty = withType(function (
  type: Type,
  a: string,
  b: number
): Predicate<unknown> {
  const predicateI = getPredicateI(type);

  return function _isType(verificable) {
    return getErrors(verificable, isPredicateIMatch(predicateI));
  };
});
