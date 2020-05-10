import { PredicateI } from "./predicateI/PredicateI";
import {
  Predicate,
  VerificaError,
  Verificable,
  getErrors,
  isObject,
  isArray,
  rawValue,
} from "verifica";

type Path = {
  frame: Frame;
  errors: VerificaError[];
  to: Entry | Frame;
};

type Frame = {
  type: "and" | "or";
  parent: Path | undefined;
  paths: Path[];
};

type Entry = {
  type: "entry";
  parent: Path;
  verificable: Verificable<unknown>;
  predicateI: PredicateI;
};

export function isPredicateIMatch(predicateI: PredicateI): Predicate<unknown> {
  return function _isPredicateIMatch(verificable) {
    const rootFrame = newAndFrame();
    const rootEntry = newEntry(rootFrame, verificable, predicateI);

    const stack: Entry[] = [rootEntry];
    while (stack.length > 0) {
      const current = stack.pop()!;

      const preconditionErrors = getPreconditionErrors(current);
      if (preconditionErrors.length > 0) {
        cascadeErrors(current.parent, preconditionErrors);
        continue;
      }

      const entries = newEntries(current);
      stack.push(...entries);
    }

    return collectErrors(rootFrame);
  };
}

function newAndFrame(parent?: Frame): Frame {
  let path: Path | undefined;
  if (parent) {
    path = {
      frame: parent,
      errors: [],
    } as any;
    parent.paths.push(path as any);
  }

  const newFrame: Frame = {
    type: "and",
    parent: path,
    paths: [],
  };

  if (path) {
    path.to = newFrame;
  }

  return newFrame;
}

function newOrFrame(parent?: Frame): Frame {
  let path: Path | undefined;
  if (parent) {
    path = {
      frame: parent,
      errors: [],
    } as any;
    parent.paths.push(path as any);
  }

  const newFrame: Frame = {
    type: "or",
    parent: path,
    paths: [],
  };

  if (path) {
    path.to = newFrame;
  }

  return newFrame;
}

function newEntry(
  frame: Frame,
  verificable: Verificable<unknown>,
  predicateI: PredicateI
): Entry {
  const path: Path = {
    frame,
    errors: [],
  } as any;
  frame.paths.push(path);

  const entry: Entry = {
    type: "entry",
    parent: path,
    verificable,
    predicateI,
  };

  path.to = entry;

  return entry;
}

function getPreconditionErrors(entry: Entry): VerificaError[] {
  let { verificable, predicateI, parent } = entry;
  predicateI = getResolved(predicateI);

  switch (predicateI.type) {
    case "object":
      return getErrors(verificable, isObject);

    case "array":
      return getErrors(verificable, isArray);

    case "primitive":
      return getErrors(verificable, predicateI.predicate);

    case "intersection":
    case "union":
      return [];

    case "symbol":
      throw new Error("Symbol should be already resolved here.");
  }
}

function getResolved(predicateI: PredicateI): PredicateI {
  let current: PredicateI = predicateI;

  while (true) {
    if (current.type !== "symbol") {
      return current;
    }

    if (!current.value) {
      throw new Error("!current.value");
    }

    current = current.value;
  }
}

function cascadeErrors(path: Path, errors: VerificaError[]) {
  let current: Path | undefined = path;

  while (current) {
    pushUnique(current.errors, errors);

    switch (current.frame.type) {
      case "and":
        current = current.frame.parent;
        break;

      case "or":
        const otherPaths = current.frame.paths.filter((q) => q !== current);
        if (otherPaths.some((q) => q.errors.length === 0)) {
          return;
        }

        errors = [
          ...errors,
          ...otherPaths.reduce<VerificaError[]>((arr, path) => {
            arr.push(...path.errors);
            return arr;
          }, []),
        ];

        current = current.frame.parent;
        break;
    }
  }
}

function pushUnique<T>(arr: T[], elements: T[]) {
  arr.push(...elements.filter((q) => arr.every((x) => x !== q)));
}

function newEntries(entry: Entry): Entry[] {
  const entries: Entry[] = [];

  let newFrame: Frame;

  const predicateI = getResolved(entry.predicateI);
  switch (predicateI.type) {
    case "array":
      const value = rawValue(entry.verificable);
      if (!Array.isArray(value)) {
        throw new Error("!Array.isArray(value)");
      }

      newFrame = newAndFrame(entry.parent.frame);
      for (let i = 0; i < value.length; i++) {
        entries.push(newEntry(newFrame, entry.verificable[i], predicateI.of));
      }
      break;

    case "intersection":
      newFrame = newAndFrame(entry.parent.frame);
      entries.push(
        ...predicateI.types.map((q) => {
          return newEntry(newFrame, entry.verificable, q);
        })
      );
      break;

    case "union":
      newFrame = newOrFrame(entry.parent.frame);
      entries.push(
        ...predicateI.types.map((q) => {
          const newNestedFrame = newAndFrame(newFrame);
          return newEntry(newNestedFrame, entry.verificable, q);
        })
      );
      break;

    case "object":
      newFrame = newAndFrame(entry.parent.frame);
      for (const prop of predicateI.props) {
        entries.push(
          newEntry(newFrame, entry.verificable[prop.name], prop.predicate)
        );
      }
      break;

    case "primitive":
      //
      break;

    case "symbol":
      throw new Error(
        "predicateI shouldn't be symbol here = should be resolved already."
      );
  }

  return entries;
}

function collectErrors(frame: Frame): VerificaError[] {
  if (
    frame.type === "or" &&
    frame.paths.some((q) => !q.errors || q.errors.length === 0)
  ) {
    return [];
  }

  return frame.paths.reduce<VerificaError[]>((arr, path) => {
    arr.push(...(path.errors || []));
    return arr;
  }, []);
}
