import { redirect } from "next/navigation";

/**
 * A rota antiga da análise. O endereço passou a ser /results/[id], que é o que o
 * e-mail de 72h e os links compartilhados usam; quem tem /analise/... salvo
 * continua chegando no mesmo lugar.
 */
export default async function LegacyAnalysisPage(props: PageProps<"/analise/[id]">) {
  const { id } = await props.params;
  redirect(`/results/${id}`);
}
