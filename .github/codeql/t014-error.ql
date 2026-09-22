/**
 * @name T014 synthetic CodeQL error
 * @description Temporary controlled Error probe for the develop ruleset.
 * @kind problem
 * @problem.severity error
 * @id cs/t014-synthetic-error
 */
import csharp

from Method m
where m.getName() = "T014SyntheticError"
select m, "Temporary controlled Error probe for T014."
