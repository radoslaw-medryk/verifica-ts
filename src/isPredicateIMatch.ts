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
  errors?: VerificaError[];
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

      if (isPathErrored(current.parent)) {
        continue;
      }

      const preconditionErrors = getPreconditionErrors(current);
      if (preconditionErrors.length > 0) {
        cascadeErrors(current.parent, preconditionErrors);
        break;
      }

      const entries = newEntries(current);
      stack.push(...entries);
    }

    return collectErrors(rootFrame);
  };
}

function newAndFrame(frame?: Frame): Frame {
  let path: Path | undefined;
  if (frame) {
    path = {
      frame,
    } as any;
    frame.paths.push(path as any);
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

function newOrFrame(frame?: Frame): Frame {
  let path: Path | undefined;
  if (frame) {
    path = {
      frame,
    } as any;
    frame.paths.push(path as any);
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

function isPathErrored(path: Path): boolean {
  let current: Path | undefined = path;

  while (current) {
    if (current.errors && current.errors.length > 0) {
      return true;
    }

    current = current.frame.parent;
  }

  return false;
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
    if (current.errors) {
      throw new Error("'current' already has errors.");
    }
    current.errors = [...errors];

    switch (current.frame.type) {
      case "and":
        current = current.frame.parent;
        break;

      case "or":
        const otherPaths = current.frame.paths.filter((q) => q !== current);
        if (otherPaths.some((q) => !q.errors)) {
          return;
        }

        current = current.frame.parent;
        break;
    }
  }
}

function newEntries(entry: Entry): Entry[] {
  const entries: Entry[] = [];

  const predicateI = getResolved(entry.predicateI);
  switch (predicateI.type) {
    case "array":
      const value = rawValue(entry.verificable);
      if (!Array.isArray(value)) {
        throw new Error("!Array.isArray(value)");
      }

      for (let i = 0; i < value.length; i++) {
        entries.push(
          newEntry(
            newAndFrame(entry.parent.frame),
            entry.verificable[i],
            predicateI.of
          )
        );
      }
      break;

    case "intersection":
      entries.push(
        ...predicateI.types.map((q) => {
          return newEntry(
            newAndFrame(entry.parent.frame),
            entry.verificable,
            q
          );
        })
      );
      break;

    case "union":
      entries.push(
        ...predicateI.types.map((q) => {
          return newEntry(newOrFrame(entry.parent.frame), entry.verificable, q);
        })
      );
      break;

    case "object":
      for (const prop of predicateI.props) {
        entries.push(
          newEntry(
            newAndFrame(entry.parent.frame),
            entry.verificable[prop.name],
            prop.predicate
          )
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
  const errors: VerificaError[] = [];

  const stack: Frame[] = [frame];
  while (stack.length > 0) {
    const current = stack.pop()!;

    const frameErrors: VerificaError[] = [];
    switch (current.type) {
      case "and":
        for (const path of current.paths) {
          frameErrors.push(...(path.errors || []));
        }
        break;

      case "or":
        if (current.paths.some((q) => !q.errors || q.errors.length === 0)) {
          break;
        }
        for (const path of current.paths) {
          frameErrors.push(...(path.errors || []));
        }
    }

    if (frameErrors.length > 0) {
      errors.push(...frameErrors);
      continue;
    }

    const deeperFrames = current.paths.map((q) => q.to).filter(isFrame);
    stack.push(...deeperFrames);
  }

  return errors;
}

function isFrame(value: Frame | Entry): value is Frame {
  return value.type === "and" || value.type === "or";
}
