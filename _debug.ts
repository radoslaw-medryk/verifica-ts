import { getErrors, asVerificable } from "verifica";
import { isType } from "./src/isType";

type Circ = {
  id: string;
  links: Circ[];
};

const x = {
  id: "x",
  links: [] as any[],
};

const y = {
  links: [] as any[],
};
x.links.push(y);
y.links.push(x);

const e = getErrors(asVerificable(x), isType<Circ>());
console.log(e);
console.log("end");
