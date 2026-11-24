// Tailwind's `dark:` variant, driven by <meta name="color-scheme"> (the single source of truth for the theme):
// dark when the scheme is pinned to dark, or when it follows the system and the system is dark. No .dark class.
// It lives in a plugin, not in a CSS @custom-variant block, because the nesting selector (&) in that block is not
// ordinary CSS and static analysers flag it.
const META = ':root:has(> head > meta[name="color-scheme"]';

export default function darkVariant({ addVariant }) {
  addVariant('dark', [
    `&:where(${META}[content="dark"]) *)`,
    `@media (prefers-color-scheme: dark) { &:where(${META}[content="light dark"]) *) }`,
  ]);
}
