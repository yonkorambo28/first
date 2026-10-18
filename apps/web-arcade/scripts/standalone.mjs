// Stitch the standalone build into one HTML file (no server needed).
import { readFileSync, writeFileSync } from "node:fs";

const css = readFileSync("dist-standalone/app.css", "utf8");
const js = readFileSync("dist-standalone/app.js", "utf8");
const REACT = "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js";
const REACT_DOM = "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js";

const html = `<title>Gandi Launch Calls</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
<style>${css}</style>
<div id="root"></div>
<script src="${REACT}"></script>
<script src="${REACT_DOM}"></script>
<script>
  // Minimal react/jsx-runtime on top of the UMD build.
  window.GandiJSX = {
    Fragment: React.Fragment,
    jsx: (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key }),
    jsxs: (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key }),
  };
</script>
<script>${js.replace(/<\/script/g, "<\\/script")}</script>
`;
writeFileSync("dist-standalone/gandi.html", html);
console.log(`dist-standalone/gandi.html ${(html.length / 1024).toFixed(0)} KB`);
