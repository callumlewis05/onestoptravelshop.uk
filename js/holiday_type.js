/* ================================
   Breakpoint helper (Laptop only)
   ================================ */
function isLaptop() {
  return window.matchMedia("(min-width: 1008px)").matches;
}

/* ================================
   Recreate source paragraph
   ================================ */
function recreateSource() {
  const output = document.getElementById("output");
  const container = document.querySelector(".info-container");
  if (!output || !container) return;

  // Remove old source if it exists
  const existing = document.getElementById("source");
  if (existing) existing.remove();

  // Recreate from original text
  const source = document.createElement("p");
  source.id = "source";
  source.innerHTML = output.dataset.originalText;
  source.style.position = "absolute";
  source.style.visibility = "hidden";
  source.style.pointerEvents = "none";
  source.style.width = `${container.getBoundingClientRect().width}px`;
  container.prepend(source);
}

/* ================================
   Reset to mobile view
   ================================ */
function resetToMobileView() {
  const output = document.getElementById("output");
  output.classList.add("paragraph-text")
  if (!output || !output.dataset.originalText) return;

  // Remove any source element
  const source = document.getElementById("source");
  if (source) source.remove();

  // Restore original HTML to output
  output.innerHTML = output.dataset.originalText;
}

/* ================================
   Main split function
   ================================ */
function splitParagraph() {
  if (!isLaptop()) {
    resetToMobileView();
    return;
  }

  const source = document.getElementById("source");
  const output = document.getElementById("output");
  const container = document.querySelector(".info-container");
  if (!source || !output || !container) return;

  // Reset output
  output.innerHTML = "";

  /* -------- Tokenize text -------- */
  const tokens = [];
  source.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent
        .trim()
        .split(/\s+/)
        .forEach(word => {
          if (word) tokens.push({ type: "word", value: word });
        });
    }
    if (node.nodeName === "BR") {
      tokens.push({ type: "break" });
    }
  });

  // Clear source for measuring
  source.textContent = "";

  const spans = tokens.map(token => {
    if (token.type === "word") {
      const span = document.createElement("span");
      span.textContent = token.value + " ";
      source.appendChild(span);
      return { ...token, span };
    }
    return token;
  });

  // Force layout
  source.getBoundingClientRect();

  const maxLineWidth = container.getBoundingClientRect().width - 30;
  let currentLine = 1;

  function addParagraph(blank = false) {
    const p = document.createElement("p");
    p.classList.add("paragraph-text");
    p.style.display = "inline";
    p.style.minHeight = "1em";
    // TEMP content to force height
    p.textContent = ".";
    // MUST be in the DOM before measuring
    output.appendChild(p);
    // Force layout
    const rect = p.getBoundingClientRect();
    const offsetSize = (
      (rect.height * window.innerWidth * 0.075) / window.innerHeight
    );
    console.log(rect.height); // ✅ NOT 0
    // Clean up temp content
    p.textContent = "";
    p.style.marginLeft = `${(currentLine - 1) * offsetSize}px`;
  }

  addParagraph();

  /* -------- Build lines -------- */
  spans.forEach(token => {
    if (token.type === "break") {
      const line = output.querySelector(
        `p:nth-of-type(${currentLine})`
      );
      line.style.display = "block";
      currentLine += 1;
      addParagraph(true);
      return;
    }

    const span = token.span;
    const rect = span.getClientRects()[0];
    if (!rect) return;

    const wordWidth = rect.width;
    let line = output.querySelector(
      `p:nth-of-type(${currentLine})`
    );
    const lineWidth = line.getBoundingClientRect().width;
    const newLineWidth = lineWidth + wordWidth + (currentLine - 1) * 4;

    if (newLineWidth < maxLineWidth) {
      line.textContent += span.textContent;
    } else {
      line.style.display = "block";
      currentLine += 1;
      addParagraph();
      line = output.querySelector(
        `p:nth-of-type(${currentLine})`
      );
      line.textContent += span.textContent;
    }
  });

  // Remove measuring source
  source.remove();
}

/* ================================
   Lifecycle hooks
   ================================ */
// Initial load
window.addEventListener("load", () => {
  const source = document.getElementById("source");
  const output = document.getElementById("output");

  // Store immutable original text ONCE
  if (source && output && !output.dataset.originalText) {
    output.dataset.originalText = source.innerHTML;
  }

  if (!isLaptop()) return;

  recreateSource();
  requestAnimationFrame(splitParagraph);
});

// Debounced resize
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (isLaptop()) {
      recreateSource();
      splitParagraph();
    } else {
      resetToMobileView();
    }
  }, 150);
});