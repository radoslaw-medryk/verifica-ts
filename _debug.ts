import { getErrors, asVerificable } from "verifica";
import { isType } from "./src/isType";

type NestedA = {
  type: "a";
  a: string;
};

type NestedB = {
  type: "b";
  b: number;
};

type Nested = NestedA | NestedB;

type Test = {
  arr: Nested[];
};

const x = {
  arr: [
    {
      type: "b",
      a: "xxx",
    },
  ],
};

const e = getErrors(asVerificable(x), isType<Test>());
console.log(e);
console.log("end");
