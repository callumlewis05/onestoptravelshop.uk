/* ================================
   Breakpoint helper (Laptop only)
   ================================ */
function isLaptop() {
  return window.matchMedia("(min-width: 1008px)").matches;
}

/* ================================
   Tokenize a node recursively
   ================================ */
function tokenizeNode(node, tokens) {
  if (node.nodeType === Node.TEXT_NODE) {
    node.textContent
      .trim()
      .split(/\s+/)
      .forEach(word => {
        if (word) tokens.push({ type: "word", value: word, tag: null });
      });
  } else if (node.nodeName === "BR") {
    tokens.push({ type: "break" });
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.nodeName.toLowerCase();
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent
          .trim()
          .split(/\s+/)
          .forEach(word => {
            if (word) tokens.push({ type: "word", value: word, tag });
          });
      }
    });
  }
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
  output.classList.add("paragraph-text");
  if (!output || !output.dataset.originalText) return;

  // Remove any source element
  const source = document.getElementById("source");
  if (source) source.remove();

  // Restore original HTML to output
  output.innerHTML = output.dataset.originalText;
}

/* ================================
   Helper to append a word to a line
   ================================ */
function appendWord(line, token) {
  if (token.tag) {
    // If the last child is already the same tag, append to it
    const last = line.lastChild;
    if (last && last.nodeName.toLowerCase() === token.tag) {
      last.textContent += token.span.querySelector(token.tag).textContent;
    } else {
      const el = document.createElement(token.tag);
      el.textContent = token.span.querySelector(token.tag).textContent;
      line.appendChild(el);
    }
  } else {
    // Plain text — append to a trailing text node if possible
    const last = line.lastChild;
    if (last && last.nodeType === Node.TEXT_NODE) {
      last.textContent += token.span.textContent;
    } else {
      line.appendChild(document.createTextNode(token.span.textContent));
    }
  }
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
  source.childNodes.forEach(node => tokenizeNode(node, tokens));

  // Clear source for measuring
  source.textContent = "";

  const spans = tokens.map(token => {
    if (token.type === "word") {
      const span = document.createElement("span");
      if (token.tag) {
        const inner = document.createElement(token.tag);
        inner.textContent = token.value + " ";
        span.appendChild(inner);
      } else {
        span.textContent = token.value + " ";
      }
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
    console.log(rect.height);
    // Clean up temp content
    p.textContent = "";
    p.style.marginLeft = `${(currentLine - 1) * offsetSize}px`;
  }

  addParagraph();

  /* -------- Build lines -------- */
  spans.forEach(token => {
    if (token.type === "break") {
      const line = output.querySelector(`p:nth-of-type(${currentLine})`);
      line.style.display = "block";
      currentLine += 1;
      addParagraph(true);
      return;
    }

    const span = token.span;
    const rect = span.getClientRects()[0];
    if (!rect) return;

    const wordWidth = rect.width;
    let line = output.querySelector(`p:nth-of-type(${currentLine})`);
    const lineWidth = line.getBoundingClientRect().width;
    const newLineWidth = lineWidth + wordWidth + (currentLine - 1) * 4;

    if (newLineWidth < maxLineWidth) {
      appendWord(line, token);
    } else {
      line.style.display = "block";
      currentLine += 1;
      addParagraph();
      line = output.querySelector(`p:nth-of-type(${currentLine})`);
      appendWord(line, token);
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