/**
 * Como cada regra do axe aparece no relatório: um título curto, a explicação em
 * inglês simples e a orientação geral de correção. As que não estão aqui usam o
 * texto do próprio axe. `litigation`: as categorias que mais aparecem em processos
 * e cartas de cobrança de acessibilidade; pesam mais no risk score.
 */

export type Impact = "critical" | "serious" | "moderate" | "minor";

export type RuleCategory = "images" | "contrast" | "buttons" | "links" | "forms" | "keyboard" | "aria" | "structure" | "other";

export interface RuleCopy {
  title: string;
  category: RuleCategory;
  litigation: boolean;
  explanation: string;
  fix: string;
}

export const CATEGORY_LABEL: Record<RuleCategory, string> = {
  images: "Images",
  contrast: "Color contrast",
  buttons: "Buttons",
  links: "Links",
  forms: "Forms",
  keyboard: "Keyboard and focus",
  aria: "ARIA",
  structure: "Page structure",
  other: "Other",
};

const RULES: Record<string, RuleCopy> = {
  "image-alt": {
    title: "Images without alt text",
    category: "images",
    litigation: true,
    explanation: "Screen readers announce these images with no description, so blind shoppers can't tell what the product or banner shows.",
    fix: "Add an alt attribute that describes the image (for products, the product and its key detail). Use alt=\"\" only for purely decorative images. In Shopify, set alt text in the product media editor or in the theme section settings.",
  },
  "input-image-alt": {
    title: "Image buttons without alt text",
    category: "images",
    litigation: true,
    explanation: "An image used as a button has no text, so assistive technology can't say what the button does.",
    fix: "Add an alt attribute to the <input type=\"image\"> that names the action, for example alt=\"Search\".",
  },
  "role-img-alt": {
    title: "Graphics without a text alternative",
    category: "images",
    litigation: true,
    explanation: "An element marked as an image has no accessible name, so screen readers skip its meaning.",
    fix: "Give the element an aria-label or aria-labelledby that describes it, or remove role=\"img\" if it's decorative.",
  },
  "svg-img-alt": {
    title: "SVG images without a text alternative",
    category: "images",
    litigation: true,
    explanation: "An SVG icon or illustration is exposed as an image but has no name.",
    fix: "Add a <title> inside the SVG or an aria-label. If the SVG is decorative, add aria-hidden=\"true\".",
  },
  "color-contrast": {
    title: "Text with low color contrast",
    category: "contrast",
    litigation: true,
    explanation: "This text is hard to read for people with low vision or color blindness, and on phones in bright light.",
    fix: "Raise the contrast to at least 4.5:1 for normal text and 3:1 for large text. Usually this means a darker text color or a lighter background in the theme settings or CSS.",
  },
  "button-name": {
    title: "Buttons without an accessible name",
    category: "buttons",
    litigation: true,
    explanation: "Screen readers announce these as just \"button\", so shoppers can't tell if it opens the cart, a menu or closes a popup.",
    fix: "Add visible text to the button, or an aria-label for icon-only buttons (for example aria-label=\"Open cart\").",
  },
  "input-button-name": {
    title: "Input buttons without a name",
    category: "buttons",
    litigation: true,
    explanation: "A submit or reset button has no text that assistive technology can read.",
    fix: "Add a value attribute (for example value=\"Subscribe\") or an aria-label.",
  },
  "link-name": {
    title: "Links without an accessible name",
    category: "links",
    litigation: true,
    explanation: "Screen readers can't say where these links go, which is common with icon links like social media or the logo.",
    fix: "Add link text, or an aria-label on icon-only links. If the link wraps an image, give the image alt text that names the destination.",
  },
  label: {
    title: "Form fields without labels",
    category: "forms",
    litigation: true,
    explanation: "Shoppers using a screen reader hear an unlabeled field and don't know what to type, for example in search, newsletter or checkout-related forms.",
    fix: "Connect a visible <label for=\"...\"> to each field. If the design hides the label, use a visually hidden label or aria-label instead of placeholder text alone.",
  },
  "select-name": {
    title: "Dropdowns without labels",
    category: "forms",
    litigation: true,
    explanation: "Variant or quantity dropdowns have no name, so shoppers using assistive technology don't know what they're choosing.",
    fix: "Add a <label> connected to the <select>, or an aria-label such as \"Size\".",
  },
  "autocomplete-valid": {
    title: "Invalid autocomplete values",
    category: "forms",
    litigation: false,
    explanation: "Browsers and assistive tools can't autofill these fields, which makes forms harder to complete.",
    fix: "Use valid autocomplete tokens such as email, given-name or postal-code.",
  },
  "scrollable-region-focusable": {
    title: "Scrollable areas you can't reach by keyboard",
    category: "keyboard",
    litigation: true,
    explanation: "Content inside this scrollable box can't be scrolled with the keyboard.",
    fix: "Add tabindex=\"0\" to the scrollable container, or make sure it contains a focusable element.",
  },
  "nested-interactive": {
    title: "Interactive elements inside other interactive elements",
    category: "keyboard",
    litigation: true,
    explanation: "A button or link sits inside another one, which confuses keyboard focus and screen readers.",
    fix: "Separate the controls so no button or link contains another focusable element.",
  },
  "frame-focusable-content": {
    title: "Frames that trap keyboard focus",
    category: "keyboard",
    litigation: true,
    explanation: "An embedded frame has focusable content but is removed from the keyboard order.",
    fix: "Remove tabindex=\"-1\" from the iframe, or remove the focusable content inside it.",
  },
  tabindex: {
    title: "Positive tabindex values",
    category: "keyboard",
    litigation: true,
    explanation: "A positive tabindex changes the keyboard order in a way that's hard to follow.",
    fix: "Use tabindex=\"0\" or remove tabindex so the keyboard order follows the page order.",
  },
  "target-size": {
    title: "Touch targets that are too small",
    category: "keyboard",
    litigation: false,
    explanation: "Small controls are hard to tap for people with limited dexterity, especially on mobile.",
    fix: "Make interactive targets at least 24 by 24 CSS pixels, or space them out so they don't overlap.",
  },
  "frame-title": {
    title: "Frames without titles",
    category: "structure",
    litigation: false,
    explanation: "Embedded content such as videos or chat widgets has no title, so screen readers can't describe it.",
    fix: "Add a title attribute that describes the iframe, for example title=\"Product video\".",
  },
  "html-has-lang": {
    title: "Page language is missing",
    category: "structure",
    litigation: false,
    explanation: "Screen readers don't know which language to use, so they may mispronounce the whole page.",
    fix: "Add a lang attribute to the <html> element, for example lang=\"en\". Most Shopify themes set this in theme.liquid.",
  },
  "html-lang-valid": {
    title: "Invalid page language",
    category: "structure",
    litigation: false,
    explanation: "The page language code isn't valid, so screen readers can't choose the right voice.",
    fix: "Use a valid language code such as en or en-US on the <html> element.",
  },
  "document-title": {
    title: "Page title is missing",
    category: "structure",
    litigation: false,
    explanation: "The page has no title, which is the first thing screen readers announce.",
    fix: "Add a descriptive <title> to the page.",
  },
  list: {
    title: "Lists with the wrong structure",
    category: "structure",
    litigation: false,
    explanation: "A list contains elements that aren't list items, so screen readers announce the wrong number of items.",
    fix: "Make sure <ul> and <ol> only contain <li> elements (or script/template).",
  },
  listitem: {
    title: "List items outside a list",
    category: "structure",
    litigation: false,
    explanation: "A list item isn't inside a list, so its structure is lost for assistive technology.",
    fix: "Wrap <li> elements in a <ul> or <ol>.",
  },
  "duplicate-id-aria": {
    title: "Duplicate IDs used by ARIA",
    category: "aria",
    litigation: true,
    explanation: "Two elements share an ID that ARIA or a label points to, so the wrong element may be announced.",
    fix: "Make IDs unique, especially in product sections that repeat on the page.",
  },
  "meta-viewport": {
    title: "Zoom is disabled",
    category: "structure",
    litigation: false,
    explanation: "The page blocks pinch-to-zoom, so people with low vision can't enlarge the text.",
    fix: "Remove user-scalable=no and maximum-scale from the viewport meta tag.",
  },
};

function fallback(ruleId: string, help: string): RuleCopy {
  const aria = ruleId.startsWith("aria-");
  return {
    title: help,
    category: aria ? "aria" : "other",
    litigation: aria,
    explanation: aria
      ? "ARIA attributes here are missing or used incorrectly, so assistive technology may announce the element wrongly or not at all."
      : "This element doesn't meet a WCAG success criterion checked by the scan.",
    fix: aria
      ? "Use native HTML elements where possible, and make sure ARIA roles, states and references are valid. Remove ARIA you don't need."
      : "Review the element against the linked WCAG guidance and update the theme code.",
  };
}

export function ruleCopy(ruleId: string, help: string): RuleCopy {
  return RULES[ruleId] ?? fallback(ruleId, help);
}

export const IMPACT_ORDER: Impact[] = ["critical", "serious", "moderate", "minor"];

export function normalizeImpact(value: unknown): Impact {
  return value === "critical" || value === "serious" || value === "moderate" || value === "minor" ? value : "moderate";
}
