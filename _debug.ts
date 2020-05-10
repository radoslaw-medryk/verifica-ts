import { getErrors, asVerificable } from "verifica";
import { isType } from "./src/isType";

type NestedA = {
  type: "a";
  a: string;
  c: { x: number };
};

type NestedB = {
  type: "b";
  b: number;
  d: { y: number };
};

type Nested = NestedA | NestedB;

type Test = {
  arr: Nested[];
};

const x = {
  arr: [
    {
      type: "a",
      a: "xxx",
      c: { x: 9 },
    },
    {
      type: "b",
      b: 123,
      d: { y: 1 },
    },
  ],
};

const e = getErrors(asVerificable(x), isType<Test>());
console.log(e);
console.log("end");
