"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { EditFeedbackResponse, RevisionStatus, VideoEdit } from "@/lib/types";

interface EditFeedbackProps {
  /** A versão pronta sobre a qual a pergunta é feita. */
  edit: VideoEdit;
  onSubmit: (rating: "liked" | "disliked", note: string | null) => Promise<EditFeedbackResponse>;
}

const MAX_NOTE = 1000;

/**
 * "Gostou do vídeo editado?" — embaixo de cada versão pronta.
 *
 * Gostou: fica registrado e pronto. Não gostou: abre a caixa do que a pessoa
 * mudaria, e o que ela escreve vira a próxima versão (quando cortar resolve) ou
 * uma resposta dizendo como fazer no editor dela (quando não resolve).
 */
export function EditFeedback({ edit, onSubmit }: EditFeedbackProps) {
  const t = useTranslations("Analysis.cuts.feedback");
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  // o que aconteceu com o último pedido nesta visita (o `reply` também fica na edição)
  const [outcome, setOutcome] = useState<RevisionStatus | null>(null);

  async function send(rating: "liked" | "disliked") {
    setSending(true);
    try {
      const response = await onSubmit(rating, rating === "disliked" ? note.trim() : null);
      setOutcome(response.revision?.status ?? null);
      setWriting(false);
      setNote("");
    } catch {
      // a mensagem de erro aparece no painel; o texto continua na caixa
    } finally {
      setSending(false);
    }
  }

  if (writing) {
    const tooShort = note.trim().length < 3;
    return (
      <form
        className="mt-6 border-t border-line pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!tooShort) void send("disliked");
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-display text-[16px] font-medium tracking-[-0.01em]">{t("noteLabel")}</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={MAX_NOTE}
            rows={4}
            autoFocus
            disabled={sending}
            placeholder={t("notePlaceholder")}
            className="w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none disabled:opacity-50"
          />
        </label>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("noteHint")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" className="min-h-11" disabled={sending || tooShort}>
            {sending ? t("sending") : t("submit")}
          </Button>
          <Button variant="ghost" className="min-h-11" onClick={() => setWriting(false)} disabled={sending}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    );
  }

  if (edit.feedback === "liked") {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5">
        <p className="inline-flex items-center gap-2 text-[14px]">
          <ThumbsUp size={15} strokeWidth={1.75} aria-hidden="true" className="text-confirmed" />
          {t("likedThanks")}
        </p>
        <button type="button" onClick={() => setWriting(true)} className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
          {t("changeSomething")}
        </button>
      </div>
    );
  }

  if (edit.feedback === "disliked") {
    // a versão continua a mesma: ou cortar não resolve o pedido, ou a IA não respondeu agora
    const fallback =
      outcome === "limit" ? t("status.limit") : outcome === "keep_original" ? t("status.keepOriginal") : outcome === "not_applicable" ? t("status.notApplicable") : t("status.unavailable");
    return (
      <div className="mt-6 border-t border-line pt-5" aria-live="polite">
        {edit.feedback_note && (
          <p className="text-[13.5px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">{t("youAsked")}</span> &ldquo;{edit.feedback_note}&rdquo;
          </p>
        )}
        <p className="mt-3 rounded-sm border border-line bg-paper p-4 text-[14px] leading-relaxed">{edit.reply || fallback}</p>
        {outcome !== "limit" && (
          <button type="button" onClick={() => setWriting(true)} className="mt-3 text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            {t("askAgain")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
      <p className="font-display text-[16px] font-medium tracking-[-0.01em]">{t("question")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="min-h-10" onClick={() => void send("liked")} disabled={sending}>
          <ThumbsUp size={14} strokeWidth={1.75} aria-hidden="true" />
          {t("liked")}
        </Button>
        <Button variant="secondary" size="sm" className="min-h-10" onClick={() => setWriting(true)} disabled={sending}>
          <ThumbsDown size={14} strokeWidth={1.75} aria-hidden="true" />
          {t("disliked")}
        </Button>
      </div>
    </div>
  );
}
