// wwwroot/js/common-date-display.js
//
// GLOBAL utility: makes every <input class="form-control" type="date">
// in the app display dd-mm-yyyy instead of the browser/OS-locale default,
// without changing its underlying value (which stays yyyy-MM-dd, per the
// HTML5 spec for type="date" — required for correct submission/model
// binding).
//
// USAGE — just write a plain date input, nothing else needed:
//
//   <input type="date" class="form-control" value="2026-08-20">
//
// Placeholder: shown automatically as "dd-mm-yyyy" whenever the input has
// no value. Override the text via a normal placeholder attribute if you
// want something else:
//
//   <input type="date" class="form-control" placeholder="Select date">
//
// No wrapper div, no extra span, no marker class. This script finds every
// input.form-control[type="date"] on the page (or inside a given root),
// wraps it in a positioning container, and injects a display overlay on
// top of it automatically — all at runtime.
//
// Auto-runs on DOMContentLoaded, and is also exposed as
// window.initDateDisplay(root) for dynamically-injected markup (rows
// added by JS, content loaded into a modal, an AJAX-loaded partial) —
// call it with the newly-inserted container after injecting new HTML.

// Matches yyyy-MM-dd (native <input type="date"> value format)
const ISO_DATE_RE = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/;

const DEFAULT_DATE_PLACEHOLDER = 'dd-mm-yyyy';

function formatDateDisplayCommon(isoValue) {
    if (!isoValue) return '';
    const match = ISO_DATE_RE.exec(isoValue);
    if (!match) return isoValue; // not ISO — show as-is rather than mangling
    const [, y, m, d] = match;
    return `${d}-${m}-${y}`;
}

function syncOneDateDisplay(input) {
    const overlay = input._dateDisplayOverlay;
    if (!overlay) return;

    if (!input.value) {
        // Empty — show the placeholder instead, muted. Respects a real
        // placeholder="" attribute on the input if one was set, otherwise
        // falls back to "dd-mm-yyyy".
        overlay.textContent = input.getAttribute('placeholder') || DEFAULT_DATE_PLACEHOLDER;
        overlay.classList.add('date-display-placeholder');
    } else {
        overlay.textContent = formatDateDisplayCommon(input.value);
        overlay.classList.remove('date-display-placeholder');
    }
}

// Wraps `input` in a positioning <div> and appends the overlay <span>,
// preserving the input's original position in the DOM and any existing
// classes/attributes. Idempotent — skips inputs already wrapped.
function wrapWithDateDisplay(input) {
    if (input.dataset.dateDisplayBound === '1') return;

    const wrap = document.createElement('div');
    wrap.className = 'date-display-wrap';
    wrap.style.position = 'relative';

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const overlay = document.createElement('span');
    overlay.className = 'date-display-overlay';
    wrap.appendChild(overlay);

    input._dateDisplayOverlay = overlay;

    input.addEventListener('change', () => syncOneDateDisplay(input));
    input.addEventListener('input', () => syncOneDateDisplay(input));
    input.dataset.dateDisplayBound = '1';

    syncOneDateDisplay(input); // initial paint
}

// Call this after injecting new markup dynamically (e.g. a row added via
// JS, a partial loaded into a modal) so any new date inputs inside it get
// picked up without a full page reload.
function initDateDisplay(root) {
    const scope = root || document;
    scope.querySelectorAll('input.form-control[type="date"]').forEach(wrapWithDateDisplay);
}

document.addEventListener('DOMContentLoaded', () => initDateDisplay());

// Expose for dynamically-injected content (modals, AJAX-loaded partials, etc.)
window.initDateDisplay = initDateDisplay;