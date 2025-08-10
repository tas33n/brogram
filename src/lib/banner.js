// src/lib/banner.js
const gradient = require("gradient-string");

// Instagram-ish palette: orange → yellow → pink → purple → blue
const igGradient = gradient([
  "#F58529",
  "#FEDA77",
  "#DD2A7B",
  "#8134AF",
  "#515BD4"
]);

// Monospace ASCII banner (keeps terminals clean on Win/Linux/macOS)
const BANNER = `
██████  ██████   ██████   ██████  ██████   █████  ███    ███
██   ██ ██   ██ ██    ██ ██      ██       ██   ██ ████  ████
██████  ██████  ██    ██ ██  ███ ██   ███ ███████ ██ ████ ██
██   ██ ██   ██ ██    ██ ██   ██ ██    ██ ██   ██ ██  ██  ██
██████  ██   ██  ██████   ██████   █████  ██   ██ ██      ██

                 BROGRAM
               IG automation, bro-grade
`;

function printBanner() {
  try {
    console.log(igGradient.multiline(BANNER));
  } catch {
    // Fallback if custom gradient is unavailable
    console.log(gradient.pastel.multiline(BANNER));
  }
}

module.exports = { printBanner };
