/* ==========================================================================
   Publishub · monta um slide a partir do JSON e confere se ele cabe
   --------------------------------------------------------------------------
   window.renderSlide(post, index) → Promise<relatório>

   Cada slide tem um `layout` (cover, steps, chart, beforeAfter, mistake, stat,
   cta, text). O texto aceita três marcações:
     *assim*        → ênfase (itálico caramelo nos títulos, negrito no corpo)
     ==assim==      → marca-texto caramelo
     [ASSIM]        → placeholder de dado real, destacado para ninguém postar sem trocar

   Depois de montar, o texto que tem `data-fit` encolhe até caber, sem passar
   do piso (título 64 px, corpo 32 px). O relatório diz o que não coube, o que
   saiu da área segura e qualquer texto abaixo do tamanho mínimo.
   ========================================================================== */
(function () {
  const ICON = {
    arrowDown: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v34M10 27l14 14 14-14"/></svg>',
    arrowRight: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 24h34M27 10l14 14-14 14"/></svg>',
    check: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17l7 7L27 8"/></svg>',
  };

  function esc(text) {
    return String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  /** O texto do JSON em HTML seguro, com as três marcações. */
  function fmt(text) {
    return esc(text)
      .replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>')
      .replace(/==([^=]+)==/g, '<span class="mark">$1</span>')
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  /* data-role marca o que o relatório confere: title (≥ 64 px) e body (≥ 32 px) */
  const display = (text) => `<h1 class="t-display" data-fit data-min="72" data-role="title">${fmt(text)}</h1>`;
  const title = (text, tag = "h2") => `<${tag} class="t-title" data-fit data-min="64" data-role="title">${fmt(text)}</${tag}>`;
  const lead = (text) => (text ? `<p class="t-lead" data-fit data-min="34" data-role="body">${fmt(text)}</p>` : "");
  const body = (text, extra = "") => (text ? `<p class="t-body ${extra}" data-fit data-min="32" data-role="body">${fmt(text)}</p>` : "");
  const quote = (text, extra = "") => `<p class="t-quote ${extra}" data-fit data-min="38" data-role="body">${fmt(text)}</p>`;
  const kicker = (text) => (text ? `<p class="kicker label accent">${fmt(text)}</p>` : "");

  const LAYOUTS = {
    cover: (s) => `${kicker(s.kicker)}${display(s.title)}${lead(s.lead)}`,

    text: (s) => `${kicker(s.kicker)}${title(s.title)}${(s.paragraphs || []).map((p) => body(p)).join("")}`,

    steps: (s) => `
      ${kicker(s.kicker)}${title(s.title)}
      <ol class="steps">${(s.items || [])
        .map(
          (item, i) => `<li><span class="num">${String(i + 1).padStart(2, "0")}</span><div>
            <h3 data-fit data-min="32" data-role="body">${fmt(item.title)}</h3>${item.text ? body(item.text, "muted") : ""}</div></li>`,
        )
        .join("")}</ol>`,

    chart: (s) => `
      ${kicker(s.kicker)}${title(s.title)}
      <figure class="chart-card" data-box>
        ${s.chart.tag ? `<figcaption class="label chart-tag">${fmt(s.chart.tag)}</figcaption>` : ""}
        <div data-chart></div>
      </figure>
      ${s.rows ? `<div class="rows">${s.rows.map((r) => `<div class="row${r.accent ? " accent" : ""}"><span class="label">${fmt(r.label)}</span><span class="value" data-fit data-min="36" data-role="body">${fmt(r.value)}</span></div>`).join("")}</div>` : ""}
      ${body(s.note, "muted")}`,

    beforeAfter: (s) => `
      ${kicker(s.kicker)}${s.title ? title(s.title) : ""}
      <div class="ba">
        <div class="ba-side ba-before" data-box><p class="label">${fmt(s.before.label)}</p>${quote(s.before.text)}</div>
        <div class="ba-arrow">${ICON.arrowDown}</div>
        <div class="ba-side ba-after" data-box><p class="label accent">${fmt(s.after.label)}</p>${quote(s.after.text)}</div>
      </div>
      ${body(s.why, "muted")}`,

    mistake: (s) => `
      ${kicker(s.kicker)}${title(s.title)}
      ${s.example ? `<div class="callout" data-box><p class="label">${fmt(s.example.label)}</p>${quote(s.example.text)}</div>` : ""}
      <div class="split">
        ${(s.sections || []).map((sec) => `<div><p class="label accent">${fmt(sec.label)}</p>${body(sec.text)}</div>`).join("")}
      </div>
      ${body(s.note, "muted")}`,

    stat: (s) => `
      ${kicker(s.kicker)}
      <div class="two-col">
        <div data-box><p class="stat-value" data-fit data-min="96">${fmt(s.value)}</p>${body(s.valueLabel, "muted")}</div>
        <div data-box>${title(s.title)}${(s.paragraphs || []).map((p) => body(p)).join("")}</div>
      </div>`,

    cta: (s) => `
      ${kicker(s.kicker)}${title(s.title)}
      ${s.price ? `<div class="price"><span class="price-value">${fmt(s.price.value)}</span><span class="t-lead" data-role="body">${fmt(s.price.note)}</span></div>` : ""}
      ${s.items ? `<ul class="checks">${s.items.map((item) => `<li>${ICON.check}${body(item)}</li>`).join("")}</ul>` : ""}
      ${lead(s.lead)}
      <p class="cta-url" data-box>${esc(s.url || "getpublishub.com")}${ICON.arrowRight}</p>
      ${body(s.fine, "muted")}`,
  };

  /** A régua que o relatório usa: a área onde texto pode existir (no story, sem as faixas do Instagram). */
  function safeBox(format, width, height) {
    if (format === "story") return { top: 250, bottom: height - 340, left: 0, right: width };
    return { top: 0, bottom: height, left: 0, right: width };
  }

  function shrink(el, factor) {
    const size = parseFloat(getComputedStyle(el).fontSize);
    const min = parseFloat(el.dataset.min || "0");
    const next = Math.max(min, Math.floor(size * factor));
    if (next >= size) return false;
    el.style.fontSize = `${next}px`;
    return true;
  }

  async function renderSlide(post, index) {
    const slide = post.slides[index];
    const build = LAYOUTS[slide.layout];
    if (!build) throw new Error(`layout desconhecido: "${slide.layout}" (opções: ${Object.keys(LAYOUTS).join(", ")})`);
    const total = post.slides.length;
    const isCarousel = post.format === "carousel";
    const counter = isCarousel ? `<span class="counter">${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>` : "";
    const swipe = isCarousel && index === 0 && total > 1 ? `<span class="label swipe">${esc(post.swipe || "arraste")}${ICON.arrowRight.replace("<svg", '<svg width="28" height="28"')}</span>` : "";
    const footer = slide.layout === "cta" ? "" : `<span class="url">${esc(post.footer ?? "getpublishub.com")}</span>`;

    document.body.className = `fmt-${post.format}`;
    document.documentElement.lang = post.lang || "pt-BR";
    document.body.innerHTML = `
      <main class="slide layout-${slide.layout}">
        <div class="rule" aria-hidden="true"></div>
        <header class="chrome-top"><span class="brand"><img src="../assets/logo.svg" alt="">Publishub</span>${counter}</header>
        <section class="body">${build(slide)}</section>
        <footer class="chrome-bottom">${footer}${swipe}</footer>
      </main>`;

    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));

    // o gráfico com a largura real do cartão: 1 unidade do SVG = 1 px
    const holder = document.querySelector("[data-chart]");
    if (holder) {
      const chart = slide.chart;
      holder.innerHTML = window.retentionChart({ ...chart, width: Math.round(holder.clientWidth), height: chart.height || (post.format === "x" ? 300 : 400) });
    }

    // encaixe, 3% por vez até caber ou bater no piso: primeiro só o que passa da
    // largura (uma palavra longa não encolhe o slide inteiro), depois tudo, se faltar altura
    const area = document.querySelector(".body");
    const fits = [...document.querySelectorAll("[data-fit]")];
    const tooWide = () => fits.filter((el) => el.scrollWidth > el.clientWidth + 1);
    for (let rounds = 0; rounds < 80; rounds++) {
      const wide = tooWide();
      if (!wide.length || !wide.map((el) => shrink(el, 0.97)).some(Boolean)) break;
    }
    for (let rounds = 0; rounds < 80 && area.scrollHeight > area.clientHeight + 1; rounds++) {
      if (!fits.map((el) => shrink(el, 0.97)).some(Boolean)) break;
    }

    // o relatório
    const errors = [];
    const W = document.body.clientWidth;
    const H = document.body.clientHeight;
    const safe = safeBox(post.format, W, H);
    if (area.scrollHeight > area.clientHeight + 1) errors.push(`o conteúdo passa ${area.scrollHeight - area.clientHeight}px da caixa, mesmo com o texto no tamanho mínimo`);
    for (const el of fits) if (el.scrollWidth > el.clientWidth + 1) errors.push(`texto mais largo que a caixa: "${el.textContent.trim().slice(0, 60)}"`);

    // todo pedaço de texto dentro da tela (e da área segura, no story)
    const walker = document.createTreeWalker(document.querySelector(".slide"), NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width === 0) continue;
        if (rect.left < safe.left - 1 || rect.right > safe.right + 1 || rect.top < safe.top - 1 || rect.bottom > safe.bottom + 1) {
          errors.push(`texto fora da área ${post.format === "story" ? "segura" : "da tela"}: "${node.textContent.trim().slice(0, 50)}"`);
          break;
        }
      }
    }
    // cada linha de texto dentro da caixa dela (cartão, coluna, bloco) e nenhuma por cima da outra
    const boxes = [];
    const walker2 = document.createTreeWalker(document.querySelector(".slide"), NodeFilter.SHOW_TEXT);
    for (let node = walker2.nextNode(); node; node = walker2.nextNode()) {
      if (!node.textContent.trim() || node.parentElement.closest("svg")) continue;
      const box = node.parentElement.closest("[data-box], .body, .chrome-top, .chrome-bottom");
      const limit = box.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      // o bloco do texto: linhas do mesmo parágrafo podem se tocar, blocos diferentes não
      const block = node.parentElement.closest("p, h1, h2, h3, li, figcaption, span.counter, span.url, span.brand, span.swipe, span.value, .label") || node.parentElement;
      for (const r of range.getClientRects()) {
        if (r.width === 0) continue;
        if (r.left < limit.left - 1 || r.right > limit.right + 1) {
          errors.push(`texto passa da caixa: "${node.textContent.trim().slice(0, 50)}"`);
          break;
        }
        boxes.push({ r, block, text: node.textContent.trim() });
      }
    }
    for (const t of document.querySelectorAll("[data-chart] text")) {
      const r = t.getBoundingClientRect();
      const card = holder.getBoundingClientRect();
      if (r.left < card.left - 1 || r.right > card.right + 1) errors.push(`rótulo do gráfico fora do cartão: "${t.textContent}"`);
      boxes.push({ r, block: t, text: t.textContent });
    }
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 3 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3;
    const seen = new Set();
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.block === b.block || a.block.contains(b.block) || b.block.contains(a.block)) continue;
        if (!overlap(a.r, b.r)) continue;
        const key = `${a.text}|${b.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        errors.push(`textos sobrepostos: "${a.text.slice(0, 30)}" × "${b.text.slice(0, 30)}"`);
      }
    }

    // tamanhos mínimos
    const warnings = [];
    for (const el of document.querySelectorAll('[data-role="title"]')) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 64) errors.push(`título com ${size}px (mínimo 64): "${el.textContent.trim().slice(0, 40)}"`);
    }
    for (const el of document.querySelectorAll('[data-role="body"]')) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 32) errors.push(`corpo com ${size}px (mínimo 32): "${el.textContent.trim().slice(0, 40)}"`);
    }
    const shrunk = fits.filter((el) => el.style.fontSize).map((el) => `${el.tagName.toLowerCase()} → ${el.style.fontSize}`);
    if (shrunk.length) warnings.push(`texto encolhido para caber: ${shrunk.join(", ")}`);
    const placeholders = [...document.querySelectorAll(".ph")].map((el) => el.textContent);
    return { errors, warnings, placeholders };
  }

  window.renderSlide = renderSlide;
})();
