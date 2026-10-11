/* As classes do MobileMore e do MobileTabs, fora do arquivo "use client" para os
   componentes de servidor poderem usá-las. Escritas por inteiro para o Tailwind achá-las. */

/** Recolhido no celular até tocar em "Ver mais" (dentro de um MobileMore). */
export const MORE_HIDDEN = "max-lg:group-data-[open=false]/more:hidden";

const TAB_HIDDEN: Record<string, string> = {
  without: "max-lg:group-data-[active=with]/tabs:hidden",
  with: "max-lg:group-data-[active=without]/tabs:hidden",
};

/** Escondido no celular quando a outra aba está ativa (dentro de um MobileTabs). */
export function tabHidden(id: string) {
  return TAB_HIDDEN[id] ?? "";
}
