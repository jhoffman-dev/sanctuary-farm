## What grading one answer decided.
class_name GradeResult
extends RefCounted

## An Outcome string.
var outcome: String
var correct: bool
var fact: Fact
var correct_answer: int
var previous_box: int
var new_box: int
## This answer moved the fact into "mastered".
var fact_mastered: bool
## The family this answer completed, or FactTuning.NO_FAMILY.
var family_just_mastered: int
