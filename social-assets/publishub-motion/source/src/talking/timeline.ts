/* ==========================================================================
   Publishub · talking head: o mapa do corte
   --------------------------------------------------------------------------
   Tudo aqui sai da fala de verdade. `words.json` é a transcrição palavra a
   palavra (faster-whisper large-v3), já remapeada para a linha do tempo
   editada pelo `scripts/talking-remap.py`. As páginas de legenda, as ênfases,
   a câmera e os elementos gráficos se prendem a índices de palavra, não a
   segundos soltos: se a transcrição mudar, o corte acompanha.
   ========================================================================== */

import EDIT from "./edit.json";
import WORDS_JSON from "./words.json";

/* As durações ficam em edit.json: a animação e a trilha de efeitos
   (scripts/make-sound-talking.mjs) leem o mesmo arquivo. */
export const FPS = EDIT.fps;

/** O vídeo editado (public/talking/face-cut.mp4): 1417 quadros, 47,23 s.
    Começa direto na fala e termina no "valeu?": sem abertura nem fechamento. */
export const CUT_FRAMES = EDIT.cut;
export const DURATION = CUT_FRAMES;

/** Os cortes secos (quadros do vídeo editado) onde uma pausa foi removida. */
export const JUMP_CUTS = EDIT.jumpCuts;

export interface SpokenWord {
  i: number;
  text: string;
  start: number; // segundos no vídeo editado
  end: number;
}
export const WORDS = WORDS_JSON as SpokenWord[];

export const f = (sec: number) => Math.round(sec * FPS);
/** Quadro em que a palavra `i` começa a ser dita. */
export const at = (i: number) => f(WORDS[i].start);
/** Quadro em que a palavra `i` termina. */
export const until = (i: number) => f(WORDS[i].end);

/* ---------- legendas ----------
   Cada página é um trecho curto de fala (índices inclusivos). `mark` é a
   ênfase forte (marca-texto creme, tinta escura), `pen` a leve (a caneta azul,
   com um traço desenhado embaixo), `stretch` abre o espaçamento da palavra
   enquanto ela é dita. `hero` é o tamanho grande do gancho. */
export type Emphasis = "mark" | "pen" | "stretch";
export interface Page {
  from: number;
  to: number;
  em?: Record<number, Emphasis>;
  hero?: boolean;
}

export const PAGES: Page[] = [
  { from: 0, to: 1, hero: true, em: { 1: "pen" } }, // Muitos influencers
  { from: 2, to: 4, hero: true }, // acabam não tendo
  { from: 5, to: 6, hero: true, em: { 6: "mark" } }, // muito TEMPO
  { from: 7, to: 9, hero: true, em: { 9: "pen" } }, // para poder editar
  { from: 10, to: 12, hero: true }, // o seu vídeo.
  { from: 13, to: 16 }, // Acaba recorrendo a plataformas
  { from: 17, to: 20, em: { 18: "pen", 19: "pen", 20: "pen" } }, // como CapCut, DaVinci, Premiere,
  { from: 21, to: 25 }, // mas só que acaba editando
  { from: 26, to: 27, em: { 27: "mark" } }, // tudo manualmente.
  { from: 28, to: 33 }, // E dependendo do formato do vídeo,
  { from: 34, to: 36 }, // isso pode acabar
  { from: 37, to: 38, em: { 37: "stretch", 38: "mark" } }, // demorando demais.
  { from: 39, to: 44 }, // Foi para isso que eu criei
  { from: 45, to: 46, em: { 46: "pen" } }, // uma solução
  { from: 47, to: 50, em: { 50: "mark" } }, // que se chama Publishub,
  { from: 51, to: 54, em: { 54: "pen" } }, // que seria um copiloto
  { from: 55, to: 57, em: { 56: "pen", 57: "pen" } }, // de inteligência artificial
  { from: 58, to: 62 }, // capaz de ajudar os criadores
  { from: 63, to: 64 }, // de conteúdo
  { from: 65, to: 67, em: { 67: "mark" } }, // a editar melhor
  { from: 68, to: 70 }, // os seus vídeos.
  { from: 71, to: 73 }, // Basicamente a plataforma
  { from: 74, to: 75, em: { 74: "pen" } }, // funciona assim.
  { from: 76, to: 80, em: { 78: "pen" } }, // a pessoa joga o vídeo
  { from: 81, to: 83 }, // lá na plataforma,
  { from: 84, to: 87 }, // ela irá agir como
  { from: 88, to: 91, em: { 91: "pen" } }, // se fosse um copiloto
  { from: 92, to: 96, em: { 96: "mark" } }, // e dando sugestões de cortes,
  { from: 97, to: 99, em: { 99: "mark" } }, // sugestões de retenção,
  { from: 100, to: 104, em: { 102: "pen", 104: "pen" } }, // além de aprender com você
  { from: 105, to: 108 }, // também todos os processos
  { from: 109, to: 110 }, // da edição
  { from: 111, to: 114 }, // que você acaba utilizando
  { from: 115, to: 116 }, // na plataforma.
  { from: 117, to: 120 }, // Se você se interessou
  { from: 121, to: 124, em: { 124: "pen" } }, // e você quer testar
  { from: 125, to: 126 }, // a plataforma,
  { from: 127, to: 130, em: { 130: "pen" } }, // é só você clicar
  { from: 131, to: 135, em: { 132: "mark" } }, // no link aí na bio,
  { from: 136, to: 136 }, // valeu?
];

/* ---------- câmera ----------
   Cada chave leva a câmera ao enquadramento dela em `dur` quadros a partir de
   `at` (dur 0 = corte seco). `s` é o zoom em torno do rosto, `x`/`y` deslocam
   o quadro em px. Os cortes secos caem nos JUMP_CUTS, onde a mudança de
   enquadramento esconde a pausa removida; o resto é empurrão lento ou punch-in
   curto numa frase que importa. Zoom máximo 1,2: a imagem vem de 478 px. */
export interface CamKey {
  at: number;
  s: number;
  x?: number;
  y?: number;
  dur?: number;
  ease?: "out" | "inOut";
}

export const CAMERA: CamKey[] = [
  // gancho: começa fechado no rosto e aproxima devagar
  { at: 0, s: 1.16, y: 18 },
  { at: 1, s: 1.2, y: 22, dur: at(12) + 6, ease: "inOut" },
  // "Acaba recorrendo...": abre, dá espaço às ferramentas na parede
  { at: at(13), s: 1.0, x: 26 },
  // "manualmente": punch-in
  { at: at(27) - 2, s: 1.1, x: 10, dur: 7 },
  // corte seco 1 → "E dependendo do formato"
  { at: JUMP_CUTS[0], s: 1.04, x: -16 },
  // "demorando demais": aperta devagar até o fim da frase
  { at: at(37), s: 1.14, x: -8, y: 10, dur: until(38) - at(37) + 6, ease: "inOut" },
  // "Foi para isso que eu criei": a virada, plano aberto
  { at: at(39), s: 1.0 },
  // "Publishub": punch-in curto
  { at: at(50), s: 1.07, dur: 8 },
  { at: at(58), s: 1.02, dur: 30, ease: "inOut" },
  // "a editar melhor": aproxima
  { at: at(65), s: 1.1, dur: 10 },
  // "Basicamente... funciona assim": abre para o produto
  { at: at(71), s: 1.0, x: 0 },
  { at: at(76), s: 1.04, dur: at(100) - at(76), ease: "inOut" },
  // corte seco 2 → "além de aprender com você"
  { at: JUMP_CUTS[1], s: 1.08, x: 14 },
  // corte seco 3 → o convite
  { at: JUMP_CUTS[2], s: 1.0, x: 0 },
  { at: JUMP_CUTS[2] + 1, s: 1.07, dur: CUT_FRAMES - JUMP_CUTS[2], ease: "inOut" },
];

/** O centro do rosto no quadro 1080 × 1920: o zoom acontece em torno dele. */
export const FACE = { x: 585, y: 640 };
