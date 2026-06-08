const FIT_SELECTOR = "[data-fit]";
let scheduledFrame = 0;

export function scheduleFitText(scope: ParentNode = document) {
  window.cancelAnimationFrame(scheduledFrame);
  scheduledFrame = window.requestAnimationFrame(() => fitText(scope));
}

export function fitText(scope: ParentNode = document) {
  const elements = Array.from(scope.querySelectorAll<HTMLElement>(FIT_SELECTOR));

  for (const element of elements) {
    fitElement(element);
  }

  const boundaries = Array.from(scope.querySelectorAll<HTMLElement>("[data-fit-boundary]"));

  for (const boundary of boundaries) {
    fitBoundary(boundary);
  }
}

function fitElement(element: HTMLElement) {
  const computed = window.getComputedStyle(element);
  const max = Number(element.dataset.fitMax) || parseFloat(computed.fontSize);
  const min = Number(element.dataset.fitMin) || 10;
  const wraps = element.dataset.fitWrap === "true";

  if (!Number.isFinite(max) || element.clientWidth <= 0 || element.clientHeight <= 0) {
    return;
  }

  element.style.fontSize = `${max}px`;
  element.style.whiteSpace = wraps ? "normal" : "nowrap";
  element.style.overflowWrap = wraps ? "anywhere" : "normal";
  element.style.wordBreak = wraps ? "break-word" : "normal";

  let low = min;
  let high = max;
  let best = min;

  for (let i = 0; i < 14; i += 1) {
    const middle = (low + high) / 2;
    element.style.fontSize = `${middle}px`;

    if (doesFit(element)) {
      best = middle;
      low = middle;
    } else {
      high = middle;
    }
  }

  element.style.fontSize = `${Math.floor(best * 100) / 100}px`;
}

function doesFit(element: HTMLElement) {
  const widthFits = element.scrollWidth <= element.clientWidth + 1;
  const heightFits = element.scrollHeight <= element.clientHeight + 12;
  const boundary = element.closest<HTMLElement>("[data-fit-boundary]");

  if (!boundary) {
    return widthFits && heightFits;
  }

  const elementRect = element.getBoundingClientRect();
  const boundaryRect = boundary.getBoundingClientRect();
  const staysInsideBoundary =
    elementRect.left >= boundaryRect.left - 1 &&
    elementRect.right <= boundaryRect.right + 1 &&
    elementRect.top >= boundaryRect.top - 1 &&
    elementRect.bottom <= boundaryRect.bottom + 1;

  return widthFits && heightFits && staysInsideBoundary;
}

function fitBoundary(boundary: HTMLElement) {
  const elements = Array.from(boundary.querySelectorAll<HTMLElement>(FIT_SELECTOR));

  for (let i = 0; i < 10 && boundaryOverflows(boundary); i += 1) {
    let changed = false;

    for (const element of elements) {
      const current = parseFloat(window.getComputedStyle(element).fontSize);
      const min = Number(element.dataset.fitMin) || 10;
      const next = Math.max(min, current * 0.92);

      if (next < current) {
        element.style.fontSize = `${Math.floor(next * 100) / 100}px`;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }
}

function boundaryOverflows(boundary: HTMLElement) {
  return (
    boundary.scrollWidth > boundary.clientWidth + 1 ||
    boundary.scrollHeight > boundary.clientHeight + 12
  );
}
