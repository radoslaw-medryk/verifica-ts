import {
  Type,
  ArrayType,
  ObjectType,
  UnionType,
  IntersectionType,
  BasicType,
  BasicTypeKind,
  LiteralType,
} from "ts-materialise";
import { PredicateI } from "./PredicateI";
import { SymbolPredicateI } from "./SymbolPredicateI";
import { ArrayPredicateI } from "./ArrayPredicateI";
import { ObjectPredicateI } from "./ObjectPredicateI";
import { UnionPredicateI } from "./UnionPredicateI";
import { IntersectionPredicateI } from "./IntersectionPredicateI";
import { PrimitivePredicateI } from "./PrimitivePredicateI";
import { Predicate, isBoolean, isOneOf, isNumber, isString } from "verifica";

type SymbolMap = Map<Type, SymbolPredicateI>;

export function getPredicateI(type: Type): PredicateI {
  const map: SymbolMap = new Map();

  const stack: Type[] = [type];
  while (stack.length > 0) {
    const current = stack.pop()!;

    const toResolve = resolve(map, current);
    stack.push(...toResolve);
  }

  const result = map.get(type);
  if (!result) {
    throw new Error("!result");
  }
  return result;
}

function resolve(map: SymbolMap, type: Type): Type[] {
  const symbol = getOrCreateSymbol(map, type);
  if (symbol.value) {
    return [];
  }

  const toResolve: Type[] = [];

  switch (type.type) {
    case "array":
      symbol.value = resolveArray(map, toResolve, type);
      break;

    case "object":
      symbol.value = resolveObject(map, toResolve, type);
      break;

    case "union":
      symbol.value = resolveUnion(map, toResolve, type);
      break;

    case "intersection":
      symbol.value = resolveIntersection(map, toResolve, type);
      break;

    case "basic":
      symbol.value = resolveBasic(map, toResolve, type);
      break;

    case "literal":
      symbol.value = resolveLiteral(map, toResolve, type);
      break;

    case "type-parameter":
      throw new Error(
        "Cannot create predicate for unresolved generic type-parameter."
      );

    default:
      throw new Error(`Unsupported type.type = '${(type as any).type}'.`);
  }

  return toResolve;
}

function resolveArray(
  map: SymbolMap,
  toResolve: Type[],
  type: ArrayType
): ArrayPredicateI {
  toResolve.push(type.itemsType);
  return {
    type: "array",
    of: getOrCreateSymbol(map, type.itemsType),
  };
}

function resolveObject(
  map: SymbolMap,
  toResolve: Type[],
  type: ObjectType
): ObjectPredicateI {
  const propTypes = Object.keys(type.members).map((name) => ({
    name,
    type: type.members[name]!,
  }));

  // TODO [RM]: index signature

  toResolve.push(...propTypes.map((q) => q.type));

  return {
    type: "object",
    props: propTypes.map(({ name, type }) => ({
      name,
      predicate: getOrCreateSymbol(map, type),
    })),
  };
}

function resolveUnion(
  map: SymbolMap,
  toResolve: Type[],
  type: UnionType
): UnionPredicateI {
  toResolve.push(...type.types);

  return {
    type: "union",
    types: type.types.map((q) => getOrCreateSymbol(map, q)),
  };
}

function resolveIntersection(
  map: SymbolMap,
  toResolve: Type[],
  type: IntersectionType
): IntersectionPredicateI {
  toResolve.push(...type.types);

  return {
    type: "intersection",
    types: type.types.map((q) => getOrCreateSymbol(map, q)),
  };
}

function resolveBasic(
  map: SymbolMap,
  toResolve: Type[],
  type: BasicType
): PrimitivePredicateI {
  return {
    type: "primitive",
    predicate: simplePrimitivePredicate(type),
  };
}

function resolveLiteral(
  map: SymbolMap,
  toResolve: Type[],
  type: LiteralType
): PrimitivePredicateI {
  return {
    type: "primitive",
    predicate: literalPrimitivePredicate(type),
  };
}

function getOrCreateSymbol(map: SymbolMap, type: Type): SymbolPredicateI {
  let symbol = map.get(type);
  if (!symbol) {
    symbol = newSymbol();
    map.set(type, symbol);
  }
  return symbol;
}

function newSymbol(): SymbolPredicateI {
  return {
    type: "symbol",
  };
}

function simplePrimitivePredicate(type: BasicType): Predicate<unknown> {
  switch (type.kind) {
    case BasicTypeKind.Any:
    case BasicTypeKind.Unknown:
      // TODO [RM]: allow any
      throw new Error("NotImplemented");

    case BasicTypeKind.BigInt:
      throw new Error("NotImplemented");

    case BasicTypeKind.Boolean:
      return isBoolean;

    case BasicTypeKind.Never:
      // TODO [RM]: deny all
      throw new Error("NotImplemented");

    case BasicTypeKind.Null:
      return isOneOf([null]);

    case BasicTypeKind.Number:
      return isNumber;

    case BasicTypeKind.String:
      return isString;

    case BasicTypeKind.Symbol:
      throw new Error("NotImplemented");

    case BasicTypeKind.Undefined:
      return isOneOf([undefined]);
  }
}

function literalPrimitivePredicate(type: LiteralType): Predicate<unknown> {
  return isOneOf([type.value]);
}
