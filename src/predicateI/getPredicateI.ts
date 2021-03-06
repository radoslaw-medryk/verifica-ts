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
import { Predicate, isBoolean, isOneOf, isNumber, isString, isSymbol, isDate } from "verifica";
import { isUnknown } from "./predicates/isUnknown";
import { isNever } from "./predicates/isNever";
import { BuiltinType, BuiltinTypeKind } from "ts-materialise/dist/types/BuiltinType";

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

        case "builtin":
            symbol.value = resolveBuiltin(map, toResolve, type);
            break;

        case "type-parameter":
            throw new Error("Cannot create predicate for unresolved generic type-parameter.");

        default:
            throw new Error(`Unsupported type.type = '${(type as any).type}'.`);
    }

    return toResolve;
}

function resolveArray(map: SymbolMap, toResolve: Type[], type: ArrayType): ArrayPredicateI {
    toResolve.push(type.itemsType);
    return {
        type: "array",
        of: getOrCreateSymbol(map, type.itemsType),
    };
}

function resolveObject(map: SymbolMap, toResolve: Type[], type: ObjectType): ObjectPredicateI {
    const propTypes = Object.keys(type.members).map(name => ({
        name,
        type: type.members[name]!,
    }));

    // TODO [RM]: index signature

    toResolve.push(...propTypes.map(q => q.type));

    return {
        type: "object",
        props: propTypes.map(({ name, type }) => ({
            name,
            predicate: getOrCreateSymbol(map, type),
        })),
    };
}

function resolveUnion(map: SymbolMap, toResolve: Type[], type: UnionType): UnionPredicateI {
    toResolve.push(...type.types);

    return {
        type: "union",
        types: type.types.map(q => getOrCreateSymbol(map, q)),
    };
}

function resolveIntersection(map: SymbolMap, toResolve: Type[], type: IntersectionType): IntersectionPredicateI {
    toResolve.push(...type.types);

    return {
        type: "intersection",
        types: type.types.map(q => getOrCreateSymbol(map, q)),
    };
}

function resolveBasic(map: SymbolMap, toResolve: Type[], type: BasicType): PrimitivePredicateI {
    return {
        type: "primitive",
        predicate: simplePrimitivePredicate(type),
    };
}

function resolveLiteral(map: SymbolMap, toResolve: Type[], type: LiteralType): PrimitivePredicateI {
    return {
        type: "primitive",
        predicate: literalPrimitivePredicate(type),
    };
}

function resolveBuiltin(map: SymbolMap, toResolve: Type[], type: BuiltinType): PrimitivePredicateI {
    return {
        type: "primitive",
        predicate: builtinPrimitivePredicate(type),
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
            return isUnknown;

        case BasicTypeKind.BigInt:
            throw new Error("NotImplemented");

        case BasicTypeKind.Boolean:
            return isBoolean;

        case BasicTypeKind.Never:
            return isNever;

        case BasicTypeKind.Null:
            return isOneOf([null]);

        case BasicTypeKind.Number:
            return isNumber;

        case BasicTypeKind.String:
            return isString;

        case BasicTypeKind.Symbol:
            return isSymbol;

        case BasicTypeKind.Undefined:
            return isOneOf([undefined]);
    }
}

function builtinPrimitivePredicate(type: BuiltinType): Predicate<unknown> {
    switch (type.kind) {
        case BuiltinTypeKind.Date:
            return isDate;
    }
}

function literalPrimitivePredicate(type: LiteralType): Predicate<unknown> {
    return isOneOf([type.value]);
}
