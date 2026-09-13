import { redirect } from "next/navigation";
import { analyses } from "@/lib/fixtures";

/** Provisório: até o /dashboard existir, a raiz abre a primeira análise. */
export default function Home() {
  redirect(`/analise/${analyses[0].id}`);
}
