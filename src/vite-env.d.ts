/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Absolute URL of a LaTeX render backend (POST <url> with { latex }).
  // Unset in a static deployment → the Live render preview is hidden.
  readonly VITE_RENDER_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
