/**
 * O título em dois tons: a primeira frase em tinta, o resto em itálico caramelo
 * ("Edit with clarity, *not guesswork.*"). Divide na primeira pausa (ponto, ?, !,
 * vírgula ou os equivalentes em japonês, coreano e hindi), então funciona nos 11 idiomas
 * sem marcar nada nas mensagens. Sem pausa, as últimas palavras ficam em itálico.
 */
const BREAK = /^(.+?[.!?。！？।](?=\s|$)|.+?[,，、](?=\s?))\s*(.+)$/s;

/** Sem pausa: as últimas palavras (3, ou 2 em título curto). Só onde há espaço entre palavras. */
function lastWords(text: string): [string, string] | null {
  const words = text.split(" ");
  if (words.length < 4) return null;
  const take = words.length >= 6 ? 3 : 2;
  return [words.slice(0, -take).join(" "), words.slice(-take).join(" ")];
}

export function Emphasis({ text }: { text: string }) {
  const match = BREAK.exec(text.trim());
  if (!match || match[2].length < 3) {
    const tail = lastWords(text.trim());
    if (!tail) return <>{text}</>;
    return (
      <>
        {tail[0]} <em>{tail[1]}</em>
      </>
    );
  }
  // japonês e chinês não separam frases com espaço
  const gap = /[。！？、，]$/.test(match[1]) ? "" : " ";
  return (
    <>
      {match[1]}
      {gap}
      <em>{match[2]}</em>
    </>
  );
}
