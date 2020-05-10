import { Predicate, getErrors } from "verifica";
import { Type, withType, HasMagicProperty } from "ts-materialise";
import { isPredicateIMatch } from "./isPredicateIMatch";
import { getPredicateI } from "./predicateI/getPredicateI";

type IsType = <T>() => Predicate<T>;

export const isType: IsType & HasMagicProperty = withType(function (
  type: Type
): Predicate<unknown> {
  const predicateI = getPredicateI(type);

  return function _isType(verificable) {
    return getErrors(verificable, isPredicateIMatch(predicateI));
  };
});
