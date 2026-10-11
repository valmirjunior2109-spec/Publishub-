/* ==========================================================================
   Publishub · anúncio de 38 s (Ad38): tema, layout e copy
   --------------------------------------------------------------------------
   O tema escuro do site (frontend/src/app/globals.css), o mesmo da v2. Tudo que
   aparece "dentro da tela" é captura real do getpublishub.com: o teste grátis
   rodado com o Reel de demonstração (public/ad38/screens e public/ad38/cast).
   ========================================================================== */
import T from "./timeline.json";

export { T };
export { D } from "../v2/theme";

/* zonas seguras do Reels (1080 × 1920): o topo tem a barra do app, a base tem a
   legenda e o nome do perfil, a direita tem os botões. O conteúdo fica entre elas. */
export const SAFE = { top: 230, bottom: 1540, left: 70, right: 960 };

/* onde cada camada mora */
export const LAYOUT = {
  headlineTop: 250,
  screen: { x: 90, y: 480, w: 900, h: 1000 }, // o cartão com a tela real
};

/* as capturas têm 1080 px de largura: 432 px CSS a 2,5× (o celular emulado) */
export const DPR = 2.5;
export const SHOT_W = 1080;

/* a copy na tela, como no roteiro */
export const COPY = {
  hook: [["WHY", "ARE", "VIEWERS"], ["LOSING", "INTEREST?"]],
  problem: ["Slow intros.", "Weak pacing.", "Missed opportunities."],
  meet: "MEET PUBLISHUB",
  meetSub: "Your AI video editing copilot", // Landing.copilot.eyebrow no site
  demo: ["Spot weak moments", "Find opportunities to improve", "Edit with more confidence"],
  payoff: [["MAKE", "EVERY", "EDIT"], ["MORE", "INTENTIONAL"]],
  cta: [["YOUR", "NEXT", "VIDEO"], ["STARTS", "HERE"]],
  url: "getpublishub.com",
  ctaNote: "No account needed to start", // Try.eyebrow no site: "No account needed"
};

export const sec = (s: number) => Math.round(s * T.fps);
