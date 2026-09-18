"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import { useErrorText } from "@/lib/useErrorText";
import type { AdminPartnerRow, AdminPartners } from "@/lib/types";

const STATUSES = ["pending", "active", "paused"] as const;

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** Uma linha por Partner: números à esquerda, os dois campos editáveis à direita. */
function Row({ partner, onChange }: { partner: AdminPartnerRow; onChange: (row: AdminPartnerRow) => void }) {
  const t = useTranslations("Admin");
  const errorText = useErrorText();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(fields: { status?: string; commission_rate?: number }) {
    setSaving(true);
    setError(null);
    try {
      onChange(await apiFetch<AdminPartnerRow>(`/api/admin/partners/${partner.id}`, { method: "POST", body: fields }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-t border-line align-top">
      <td className="py-3 pr-4">
        <p className="text-[14px]">{partner.email || partner.user_id}</p>
        <code className="text-[12.5px] text-ink-muted">{partner.code || "—"}</code>
        {error && <p className="mt-1 text-[12px] text-refuted">{error}</p>}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">{partner.clicks}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{partner.signups}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{partner.paid_customers}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{money(partner.revenue_cents)}</td>
      <td className="py-3 pr-4 text-right font-medium tabular-nums">{money(partner.commissions_owed_cents)}</td>
      <td className="py-3 pr-4">
        <select
          value={partner.status}
          disabled={saving}
          onChange={(e) => save({ status: e.target.value })}
          aria-label={t("status")}
          className="rounded-sm border border-line bg-paper px-2 py-1.5 text-[13px] text-ink"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(partner.commission_rate * 100)}
          disabled={saving}
          aria-label={t("rate")}
          onBlur={(e) => {
            const percent = Number(e.target.value);
            if (Number.isFinite(percent) && percent >= 0 && percent <= 100 && percent !== Math.round(partner.commission_rate * 100)) {
              save({ commission_rate: percent / 100 });
            }
          }}
          className="w-[72px] rounded-sm border border-line bg-paper px-2 py-1.5 text-[13px] tabular-nums text-ink"
        />
      </td>
    </tr>
  );
}

function AdminTable() {
  const t = useTranslations("Admin");
  const errorText = useErrorText();
  const [data, setData] = useState<AdminPartners | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<AdminPartners>("/api/admin/partners")
      .then(setData)
      .catch((err) => setError(errorText(err)));
  }, [errorText]);

  useEffect(load, [load]);

  function replace(row: AdminPartnerRow) {
    setData((current) => (current ? { ...current, partners: current.partners.map((p) => (p.id === row.id ? { ...p, ...row } : p)) } : current));
  }

  // sem permissão (ou falha de rede): mostra só o aviso, sem o cabeçalho da área
  if (error) return <p className="rounded-sm border border-refuted bg-paper-raised p-4 text-sm text-refuted">{error}</p>;
  if (!data) return <p className="text-[14px] text-ink-muted">{t("loading")}</p>;

  const totals = data.totals;

  return (
    <>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-3 font-display text-[30px] font-medium tracking-tight">{t("title")}</h1>
      <p className="mb-10 mt-2 text-[14px] text-ink-muted">{t("lead")}</p>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["partners", String(totals.partners)],
            ["clicks", String(totals.clicks)],
            ["signups", String(totals.signups)],
            ["conversions", String(totals.paid_customers)],
            ["revenue", money(totals.revenue_cents)],
            ["owed", money(totals.commissions_owed_cents)],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-md border border-line bg-paper-raised p-4">
            <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">{t(`totals.${key}`)}</p>
            <p className="mt-2 font-display text-[24px] font-bold leading-none tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {data.partners.length === 0 ? (
        <p className="mt-10 text-[14px] text-ink-muted">{t("empty")}</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">
                <th className="pb-2 pr-4 font-medium">{t("partner")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("totals.clicks")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("totals.signups")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("totals.conversions")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("totals.revenue")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("totals.owed")}</th>
                <th className="pb-2 pr-4 font-medium">{t("status")}</th>
                <th className="pb-2 font-medium">{t("rate")}</th>
              </tr>
            </thead>
            <tbody>
              {data.partners.map((partner) => (
                <Row key={partner.id} partner={partner} onChange={replace} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Área do administrador (ADMIN_EMAILS no backend; quem não estiver na lista recebe 403). */
export default function AdminPartnersPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 pb-24 pt-12 lg:px-16">
        <RequireAuth>{() => <AdminTable />}</RequireAuth>
      </main>
    </>
  );
}
