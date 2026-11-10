/**
 * Founding Customers: ativa as assinaturas no LANÇAMENTO (rodar só quando a Publishub estiver disponível).
 *
 * Antes de rodar: mande o e-mail de lançamento para as reservas (a lista sai no modo de ensaio), dizendo a
 * data da primeira cobrança e como cancelar. Esta data precisa estar a pelo menos 7 dias de hoje.
 *
 *   node scripts/founding-activate.mjs --first-charge=2027-01-15            (ensaio: só mostra o que faria)
 *   node scripts/founding-activate.mjs --first-charge=2027-01-15 --confirm  (cria as assinaturas)
 *
 * Para cada reserva 'reserved': pega o cartão guardado (do SetupIntent da reserva) e cria no Stripe a assinatura
 * com o preço GUARDADO NA RESERVA (o preço de fundador), com trial_end = a data da primeira cobrança (até lá,
 * nada é cobrado; o Stripe cobra nessa data e depois todo mês).
 * Travas contra cobrança em dobro: uma assinatura por e-mail (reservas repetidas da mesma pessoa ficam de fora),
 * a chave de idempotência e a conferência das assinaturas que o cliente já tem no Stripe.
 *
 * Precisa de: STRIPE_SECRET_KEY (com escrita em Subscriptions e leitura em SetupIntents), SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY. Opcional: STRIPE_FOUNDING_CUSTOMERS_PRICE_ID, STRIPE_API_BASE (só em teste).
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const NOTICE_DAYS = 7; // o mesmo de FOUNDING_TERMS.noticeDays (src/lib/founding.ts)
const PRODUCT = "founding_customers";
const PRICE_ID = process.env.STRIPE_FOUNDING_CUSTOMERS_PRICE_ID?.trim() || "price_1UaLsA2cdYlX3v8aM3XWVcLT";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const confirm = args.confirm === true;
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

if (!/^\d{4}-\d{2}-\d{2}$/.test(String(args["first-charge"] || ""))) fail("Informe --first-charge=AAAA-MM-DD (a data da primeira cobrança, combinada no e-mail de lançamento).");
const firstCharge = new Date(`${args["first-charge"]}T15:00:00Z`);
const minDate = new Date(Date.now() + NOTICE_DAYS * 86_400_000);
if (firstCharge < minDate) fail(`A primeira cobrança precisa estar a pelo menos ${NOTICE_DAYS} dias de hoje (a partir de ${minDate.toISOString().slice(0, 10)}).`);
for (const v of ["STRIPE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) if (!process.env[v]) fail(`Falta a variável ${v}.`);

const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, base ? { host: base.hostname, port: Number(base.port) || undefined, protocol: base.protocol.replace(":", "") } : undefined);
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// cada reserva é cobrada pelo preço que estava valendo quando a pessoa reservou (o "preço de fundador"),
// guardado na própria reserva; só reservas antigas sem esse campo usam o preço atual.
const prices = new Map();
async function recurringPrice(id) {
  if (!prices.has(id)) prices.set(id, await stripe.prices.retrieve(id));
  const price = prices.get(id);
  return price.type === "recurring" && price.active ? price : null;
}
if (!(await recurringPrice(PRICE_ID))) fail(`O preço ${PRICE_ID} não é recorrente e ativo.`);

const { data: pending, error } = await db.rpc("founding_commitments_pending");
if (error) fail(`Não consegui ler as reservas: ${error.message}`);
// os e-mails que já têm assinatura ativada (de uma rodada anterior): ninguém ganha uma segunda
const { data: report, error: reportError } = await db.rpc("founding_commitments_report");
if (reportError) fail(`Não consegui ler as reservas ativadas: ${reportError.message}`);
const emailKey = (email) => String(email ?? "").trim().toLowerCase();
const activatedEmails = new Set(report.commitments.filter((c) => c.status === "activated" && c.email).map((c) => emailKey(c.email)));

console.log(`${confirm ? "ATIVANDO" : "ENSAIO (nada é criado; use --confirm)"} · ${pending.length} reserva(s) · primeira cobrança ${firstCharge.toISOString().slice(0, 10)}\n`);

// a mesma pessoa pode ter reservado mais de uma vez: só a reserva mais recente com cartão confirmado vira assinatura
const byNewest = [...pending].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
const doneEmails = new Set(activatedEmails);
let ok = 0, skipped = 0;
for (const c of byNewest) {
  const label = `${c.email ?? "(sem e-mail)"} · ${c.stripe_customer_id}`;
  if (!c.stripe_customer_id || !c.stripe_setup_intent_id) { console.log(`  pula  ${label}: reserva sem cliente ou sem SetupIntent`); skipped++; continue; }
  if (c.email && doneEmails.has(emailKey(c.email))) {
    console.log(`  pula  ${label}: reserva repetida deste e-mail (cancele-a e remova o cartão no Stripe)`);
    skipped++;
    continue;
  }
  const priceId = c.stripe_price_id || PRICE_ID;
  const price = await recurringPrice(priceId);
  if (!price) { console.log(`  pula  ${label}: o preço ${priceId} não é recorrente e ativo`); skipped++; continue; }
  const setup = await stripe.setupIntents.retrieve(c.stripe_setup_intent_id);
  const paymentMethod = typeof setup.payment_method === "string" ? setup.payment_method : setup.payment_method?.id;
  if (setup.status !== "succeeded" || !paymentMethod) { console.log(`  pula  ${label}: cartão não confirmado (${setup.status})`); skipped++; continue; }
  // trava extra, além da chave de idempotência (que o Stripe só guarda por 24 h): o cliente já tem assinatura desta reserva?
  const existing = await stripe.subscriptions.list({ customer: c.stripe_customer_id, status: "all", limit: 100 });
  const already = existing.data.find((s) => s.metadata?.commitment_session === c.stripe_checkout_session_id || (s.metadata?.product === PRODUCT && s.status !== "canceled"));
  const amount = `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}/${price.recurring.interval}`;
  if (c.email) doneEmails.add(emailKey(c.email));
  if (!confirm) {
    console.log(`  ok    ${label}: ${already ? `já tem a assinatura ${already.id} (só marcaria a reserva)` : `criaria a assinatura de ${amount} (cartão ${paymentMethod})`}`);
    ok++;
    continue;
  }

  const sub =
    already ??
    (await stripe.subscriptions.create(
      {
        customer: c.stripe_customer_id,
        items: [{ price: priceId }],
        default_payment_method: paymentMethod,
        trial_end: Math.floor(firstCharge.getTime() / 1000),
        proration_behavior: "none",
        metadata: { product: PRODUCT, commitment_session: c.stripe_checkout_session_id },
        payment_settings: { save_default_payment_method: "on_subscription" },
      },
      { idempotencyKey: `founding-activate-${c.stripe_checkout_session_id}` },
    ));
  const { data: marked, error: markError } = await db.rpc("founding_commitment_activate", { p_session: c.stripe_checkout_session_id, p_subscription: sub.id, p_first_charge: firstCharge.toISOString() });
  if (markError) console.log(`  ⚠     ${label}: assinatura ${sub.id}, mas a reserva não foi marcada (${markError.message}); rode de novo`);
  else console.log(`  ativa ${label}: assinatura ${sub.id} (${amount})${already ? " já existia" : ""}${marked ? "" : " (a reserva já não estava 'reserved')"}`);
  ok++;
}
console.log(`\n${ok} ${confirm ? "ativada(s)" : "pronta(s) para ativar"} · ${skipped} pulada(s)`);
if (!confirm && pending.length) console.log(`E-mails para o aviso de lançamento:\n${pending.map((c) => c.email).filter(Boolean).join(", ")}`);
