import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonitorAction } from "@/components/monitor/MonitorAction";
import { HTML_LANG } from "@/lib/i18n";
import { UUID_RE } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Daily check",
  // links pessoais, vindos de e-mail: nunca no Google
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Aberta pelos links do e-mail do monitor (?a=confirm|stop&t=assinatura&l=pt). O botão é que confirma ou para. */
export default async function MonitorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const action = one(query.a);
  const token = one(query.t);
  if (!UUID_RE.test(id) || (action !== "confirm" && action !== "stop") || !token) notFound();
  const locale = one(query.l) === "pt" ? "pt" : "en";
  return (
    <div lang={HTML_LANG[locale]} className="container-page max-w-2xl py-16 sm:py-24">
      <MonitorAction id={id} token={token} action={action} locale={locale} />
    </div>
  );
}
