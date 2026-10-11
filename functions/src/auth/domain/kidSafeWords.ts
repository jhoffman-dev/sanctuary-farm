/**
 * The only words a username is ever built from. Curated by hand: friendly,
 * short, easy to read aloud, nothing that could be an insult. 64 of each, so a
 * single random byte picks one without bias. Changing a list is a review
 * event — `username.test.ts` checks every combination against the blocklist.
 */
export const ADJECTIVES = [
  'Brave', 'Bright', 'Bouncy', 'Breezy', 'Bubbly', 'Calm', 'Cheery', 'Clever',
  'Cozy', 'Curly', 'Daring', 'Dapper', 'Dreamy', 'Eager', 'Fancy', 'Fluffy',
  'Friendly', 'Fuzzy', 'Gentle', 'Giggly', 'Glowing', 'Golden', 'Happy', 'Helpful',
  'Honest', 'Jolly', 'Jumpy', 'Kind', 'Lively', 'Lucky', 'Mellow', 'Merry',
  'Mighty', 'Misty', 'Nimble', 'Peppy', 'Perky', 'Playful', 'Plucky', 'Polite',
  'Quick', 'Quiet', 'Rosy', 'Shiny', 'Snappy', 'Snowy', 'Sparkly', 'Speedy',
  'Spotty', 'Starry', 'Sunny', 'Swift', 'Tidy', 'Toasty', 'Trusty', 'Wavy',
  'Wise', 'Witty', 'Zippy', 'Cosmic', 'Minty', 'Rainy', 'Sandy', 'Stripy',
] as const

export const ANIMALS = [
  'Alpaca', 'Badger', 'Beaver', 'Bison', 'Bunny', 'Camel', 'Chick', 'Corgi',
  'Crane', 'Dingo', 'Dolphin', 'Duck', 'Eagle', 'Egret', 'Falcon', 'Ferret',
  'Finch', 'Fox', 'Gecko', 'Goat', 'Goose', 'Gopher', 'Heron', 'Hippo',
  'Husky', 'Ibis', 'Impala', 'Jaguar', 'Kitten', 'Koala', 'Lamb', 'Lemur',
  'Lion', 'Llama', 'Lynx', 'Macaw', 'Marmot', 'Moose', 'Newt', 'Ocelot',
  'Orca', 'Otter', 'Owl', 'Panda', 'Parrot', 'Penguin', 'Piglet', 'Pony',
  'Puffin', 'Puppy', 'Quail', 'Rabbit', 'Raven', 'Robin', 'Seal', 'Sloth',
  'Stork', 'Swan', 'Tiger', 'Toucan', 'Turtle', 'Walrus', 'Wombat', 'Zebra',
] as const

/**
 * Two-digit suffixes, minus the numbers that carry a meaning a child should
 * not be handed: 14 and 88 are hate-symbol numbers, 69 and 18 are adult jokes.
 */
const EXCLUDED_NUMBERS: ReadonlySet<number> = new Set([14, 18, 69, 88])
export const USERNAME_NUMBERS: readonly number[] = Array.from({ length: 90 }, (_, i) => i + 10).filter(
  (n) => !EXCLUDED_NUMBERS.has(n),
)
