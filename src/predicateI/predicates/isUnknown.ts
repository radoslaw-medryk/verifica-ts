import { Predicate } from "verifica";

export const isUnknown: Predicate<unknown> = function() {
    // always success
};
