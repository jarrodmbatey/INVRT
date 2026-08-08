// The smallest possible view layer — enough to replace JSX without a framework.

/**
 * el("p.eyebrow", { style: {...} }, "text", childNode)
 * Tag syntax supports one tag name plus any number of .classes.
 */
export function el(spec, props, ...children) {
  const [tag, ...classes] = String(spec).split(".");
  const node = document.createElement(tag || "div");
  if (classes.length) node.className = classes.join(" ");

  if (props && (typeof props !== "object" || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = [node.className, value].filter(Boolean).join(" ");
    else if (key === "style") Object.assign(node.style, value);
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "text") node.textContent = value;
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, value);
  }

  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Stagger an entrance animation, the way the JSX passed animationDelay inline. */
export function delay(node, ms) {
  node.style.animationDelay = `${ms}ms`;
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Match app/result's date formatting. */
export function formatDate(timestamp, opts = { year: "numeric", month: "long", day: "numeric" }) {
  return new Date(timestamp).toLocaleDateString("en-US", opts);
}
