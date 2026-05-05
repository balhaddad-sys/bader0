@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --clinical: #005eb8;
  --navy: #003087;
  --paper: #f8fafc;
  --ink: #101828;
  --muted: #667085;
  --border: #d0d5dd;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  background:
    radial-gradient(circle at top left, rgba(0, 94, 184, 0.16), transparent 28rem),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 42%, #eef4fb 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

textarea, button, input { font: inherit; }
button { cursor: pointer; }
pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }

.prose-like h1, .prose-like h2, .prose-like h3 { margin: 0; }
.prose-like pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #0f172a;
  color: #f8fafc;
  border-radius: 1rem;
  padding: 1rem;
}
