
export const DEQUE_CHECKLIST_WCAG22 = `
# Deque Web Accessibility Checklist (WCAG 2.2 AA)
Source: https://dequeuniversity.com/checklists/web/

KEY CRITERIA:
- Structure: Semantic markup, page titles (2.4.2), headings (1.3.1, 2.4.6), landmarks (2.4.1).
- Links/Navigation: Discernible text (4.1.2), consistent text (3.2.4), keyboard focus (2.1.1, 2.4.7).
- Visuals: Alt text for informative images (1.1.1), 4.5:1 contrast for small text (1.4.3), 3:1 for UI boundaries (1.4.11).
- Multimedia: Captions for video (1.2.2), audio descriptions (1.2.5), no flashing >3/sec (2.3.1).
- Input: Keyboard accessibility for all controls (2.1.1), no keyboard traps (2.1.2), programmatic labels (1.3.1, 3.3.2).
- WCAG 2.2 Additions: Focus Not Obscured (2.4.11), Target Size Minimum (2.5.8), Redundant Entry (3.3.7), Accessible Authentication (3.3.8).
`;

export const AXE_CORE_RULES_411 = `
# Axe-core 4.11 Rules Reference
Source: https://dequeuniversity.com/rules/axe/html/4.11

CORE RULES:
- ARIA: aria-allowed-attr, aria-hidden-focus, aria-input-field-name, aria-required-attr, aria-required-children, aria-required-parent, aria-roles, aria-valid-attr-value, aria-valid-attr.
- COLOR: color-contrast (4.5:1), color-contrast-enhanced (7:1).
- FORMS: checkboxgroup, form-field-has-name, input-button-name, label, radio-group, select-name.
- KEYBOARD: accesskeys, bypass, focus-order-semantics, scrollable-region-focusable, tab-index.
- LANGUAGE: html-has-lang, html-lang-valid, valid-lang.
- SENSORY & VISUAL: image-alt, input-image-alt, object-alt, role-img-alt.
- STRUCTURE: definition-list, dlitem, list, listitem, th-has-data-cells.
`;

export const ARIA_APG_REFERENCE = "https://www.w3.org/WAI/ARIA/apg/patterns/";
export const WCAG22_QUICKREF = "https://www.w3.org/WAI/WCAG22/quickref/";
