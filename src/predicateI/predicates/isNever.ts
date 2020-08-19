import { Predicate, makeError } from "verifica";

export const isNever: Predicate<never> = function(verificable) {
    return makeError(verificable, {
        type: "isNever",
    });
};
