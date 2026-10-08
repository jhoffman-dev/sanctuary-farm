/** Two load waves: one GLB per distinct atlas, then every other GLB, each URL once. */
export function splitByAtlas(sources: readonly { readonly url: string; readonly atlasUrl: string }[]): {
  first: string[]
  rest: string[]
} {
  const seenAtlases = new Set<string>()
  const seenUrls = new Set<string>()
  const first: string[] = []
  const rest: string[] = []
  for (const { url, atlasUrl } of sources) {
    if (seenUrls.has(url)) continue
    seenUrls.add(url)
    if (seenAtlases.has(atlasUrl)) {
      rest.push(url)
    } else {
      seenAtlases.add(atlasUrl)
      first.push(url)
    }
  }
  return { first, rest }
}
