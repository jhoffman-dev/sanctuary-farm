## The kinds of animal that live in the barn. Names only: how each one looks
## is the scene's business (art-direction.md §4). Three live there from day
## one; the rest hatch from the nest's eggs (Nest).
class_name Species
extends RefCounted

const COW := "cow"
const PIG := "pig"
const CHICK := "chick"
const DUCK := "duck"
const RABBIT := "rabbit"
const SHEEP := "sheep"
const CAT := "cat"
const DOG := "dog"
const HORSE := "horse"
const GOAT := "goat"
const GOOSE := "goose"
const DONKEY := "donkey"
## The animals already in the barn on a fresh farm.
const STARTING: Array[String] = [COW, PIG, CHICK]
const ALL: Array[String] = [COW, PIG, CHICK, DUCK, RABBIT, SHEEP, CAT, DOG, HORSE, GOAT, GOOSE, DONKEY]
