/** @type {import('dependency-cruiser').IConfiguration} */
// The dependency rule from docs/architecture.md, enforced. Dependencies point
// inward: domain → nothing; application → domain; adapters → application +
// domain; presentation → application (+ domain *types*). The composition root
// (apps/web/src/composition/) is the one place presentation may touch adapters.
module.exports = {
  forbidden: [
    {
      name: 'domain-depends-on-nothing',
      severity: 'error',
      comment: 'packages/domain is pure: no other package, no runtime dependency.',
      from: { path: '^packages/domain/src' },
      to: { pathNot: '^packages/domain/src' },
    },
    {
      name: 'world-depends-on-nothing',
      severity: 'error',
      comment: 'packages/world is layout data + the rules that check it: no other package, no runtime dependency.',
      from: { path: '^packages/world/src' },
      to: { pathNot: '^packages/world/' },
    },
    {
      name: 'application-only-domain',
      severity: 'error',
      comment: 'packages/application may import domain only. World is content, not a use-case dependency.',
      from: { path: '^packages/application/src' },
      to: { path: '^(packages/(persistence|audio|world)|apps)/' },
    },
    {
      name: 'adapters-not-each-other-nor-apps',
      severity: 'error',
      comment: 'Adapters depend on application + domain, never on other adapters, world or apps.',
      from: { path: '^packages/(persistence|audio)/src' },
      to: { path: '^(packages/(persistence|audio|world)|apps)/', pathNot: '^packages/$1/' },
    },
    {
      name: 'presentation-not-adapters',
      severity: 'error',
      comment: 'apps/web talks to application only; adapters are wired in the composition root.',
      from: { path: '^apps/web/src', pathNot: '^apps/web/src/composition/' },
      to: { path: '^packages/(persistence|audio)/' },
    },
    {
      name: 'presentation-domain-types-only',
      severity: 'error',
      comment: 'apps/web may import domain *types* for read-models, never domain behaviour.',
      from: { path: '^apps/web/src' },
      to: { path: '^packages/domain/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'cross-package-via-entry-only',
      severity: 'error',
      comment: 'Another package’s internals are off limits; import its public entry (src/index.ts).',
      from: { path: '^(packages|apps)/([^/]+)/' },
      to: { path: '^packages/(?!$2/)[^/]+/src/(?!index\\.ts$)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['node_modules', '\\.test\\.tsx?$', '/dist/', '/e2e/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
