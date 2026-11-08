import { buildGroups, countByImpact, riskBandOf, type IssueRow, type ReportData } from "@/lib/report";
import { ruleCopy, type Impact } from "@/lib/scanner/rules";
import { riskScore } from "@/lib/scanner/score";

/**
 * O relatório de exemplo (/scan/sample): uma loja fictícia, com problemas típicos de
 * temas Shopify. Serve para mostrar o produto antes do scan e para o teste de acessibilidade do site.
 */

const STORE = "https://example-store.com";
const PAGES = { home: `${STORE}/`, collection: `${STORE}/collections/all`, product: `${STORE}/products/linen-shirt`, cart: `${STORE}/cart` };

function row(rule: string, impact: Impact, help: string, page: string, selector: string, html: string, occurrences: number): IssueRow {
  const copy = ruleCopy(rule, help);
  return {
    page_url: page,
    rule_id: rule,
    impact,
    selector,
    html_snippet: html,
    help,
    help_url: `https://dequeuniversity.com/rules/axe/4.11/${rule}`,
    explanation: copy.explanation,
    fix_guidance: copy.fix,
    occurrences,
  };
}

const ROWS: IssueRow[] = [
  row("image-alt", "critical", "Images must have alternative text", PAGES.product, ".product__media img", '<img src="//example-store.com/cdn/shop/files/linen-shirt-front.jpg" width="1200" loading="lazy">', 9),
  row("image-alt", "critical", "Images must have alternative text", PAGES.collection, ".card__media img", '<img src="//example-store.com/cdn/shop/files/linen-shirt.jpg" class="motion-reduce">', 12),
  row("button-name", "critical", "Buttons must have discernible text", PAGES.home, "header .cart-toggle", '<button class="cart-toggle" type="button"><svg class="icon icon-cart">…</svg></button>', 3),
  row("color-contrast", "serious", "Elements must meet minimum color contrast ratio thresholds", PAGES.home, ".announcement-bar__message", '<p class="announcement-bar__message">Free shipping on orders over $75</p>', 7),
  row("color-contrast", "serious", "Elements must meet minimum color contrast ratio thresholds", PAGES.product, ".price__compare", '<s class="price__compare">$68.00</s>', 2),
  row("link-name", "serious", "Links must have discernible text", PAGES.home, "footer .social-links a", '<a href="https://instagram.com/examplestore" class="social-link"><svg>…</svg></a>', 4),
  row("label", "critical", "Form elements must have labels", PAGES.home, "#NewsletterForm-email", '<input id="NewsletterForm-email" type="email" name="contact[email]" placeholder="Email">', 1),
  row("select-name", "critical", "Select element must have an accessible name", PAGES.product, "#Option-size", '<select id="Option-size" name="options[Size]">…</select>', 1),
  row("aria-hidden-focus", "serious", "ARIA hidden element must not be focusable or contain focusable elements", PAGES.cart, ".drawer[aria-hidden=true] a", '<a href="/checkout" class="drawer__checkout">Check out</a>', 2),
  row("list", "serious", "<ul> and <ol> must only directly contain <li>, <script> or <template> elements", PAGES.collection, ".facets__list", '<ul class="facets__list"><div class="facet">…</div></ul>', 1),
];

export function sampleReport(): ReportData {
  const groups = buildGroups(ROWS, true);
  const score = riskScore(groups.map((group) => ({ ruleId: group.ruleId, help: group.title, impact: group.impact, occurrences: group.occurrences })));
  return {
    id: "sample",
    url: STORE,
    status: "done",
    isShopify: true,
    riskScore: score,
    riskBand: riskBandOf(score),
    error: null,
    createdAt: "2026-11-07T12:00:00.000Z",
    finishedAt: "2026-11-07T12:01:00.000Z",
    pages: Object.entries(PAGES).map(([kind, url]) => ({ url, kind, status: "done", error: null, issue_count: 0 })),
    counts: countByImpact(groups),
    totalOccurrences: groups.reduce((sum, group) => sum + group.occurrences, 0),
    groups,
    unlocked: true,
    lockedCount: 0,
  };
}
