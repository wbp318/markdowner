<p align="center">
  <img src="assets/logo.svg" width="128" alt="Markdowner logo">
</p>

<h1 align="center">Markdowner</h1>

<p align="center">A tiny Windows app that renders Markdown files exactly like GitHub does.</p>

## Download

Grab the latest build from the [Releases page](https://github.com/wbp318/markdowner/releases):

- **`Markdowner-x.y.z-win-x64.exe`** (installer) – one-click install, adds a Start Menu / desktop shortcut, and associates `.md` files so you can double-click them.
- **`Markdowner-x.y.z-win-x64-portable.exe`** – no install needed, just run it.

> Windows SmartScreen may warn about an unsigned app. Click **More info → Run anyway**.

## Features

- Renders GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks, heading anchors)
- Uses GitHub's own stylesheet (`github-markdown-css`) so it looks identical to github.com
- Syntax highlighting for fenced code blocks (190+ languages via highlight.js)
- Mermaid diagrams in ```` ```mermaid ```` fences, just like on GitHub
- Light / dark mode (`Ctrl+D`)
- Drag & drop any `.md` file onto the window, or `Ctrl+O`
- Live reload: edit the file in your editor and the view updates automatically
- Export to standalone HTML (`Ctrl+E`) or print / save as PDF (`Ctrl+P`)
- Relative images and links to other `.md` files just work

## Build from source

```bash
git clone https://github.com/wbp318/markdowner.git
cd markdowner
npm install
npm start          # run in dev mode
npm run build      # produces installer + portable exe in dist/
```

Pushing a tag like `v1.0.0` triggers the GitHub Actions workflow, which builds the exe and attaches it to a Release automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## License

MIT
