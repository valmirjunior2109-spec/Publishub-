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
 * com o preço do Founding Customers, com trial_end = a data da primeira cobrança (até lá, nada é cobrado; o
 * Stripe cobra nessa data e depois todo mês). A chave de idempotência evita assinatura duplicada se rodar duas vezes.
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

const price = await stripe.prices.retrieve(PRICE_ID);
if (price.type !== "recurring" || !price.active) fail(`O preço ${PRICE_ID} não é recorrente e ativo.`);

const { data: pending, error } = await db.rpc("founding_commitments_pending");
if (error) fail(`Não consegui ler as reservas: ${error.message}`);

console.log(`${confirm ? "ATIVANDO" : "ENSAIO (nada é criado; use --confirm)"} · ${pending.length} reserva(s) · preço ${PRICE_ID} (${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}/${price.recurring.interval}) · primeira cobrança ${firstCharge.toISOString().slice(0, 10)}\n`);

let ok = 0, skipped = 0;
for (const c of pending) {
  const label = `${c.email ?? "(sem e-mail)"} · ${c.stripe_customer_id}`;
  if (!c.stripe_customer_id || !c.stripe_setup_intent_id) { console.log(`  pula  ${label}: reserva sem cliente ou sem SetupIntent`); skipped++; continue; }
  const setup = await stripe.setupIntents.retrieve(c.stripe_setup_intent_id);
  const paymentMethod = typeof setup.payment_method === "string" ? setup.payment_method : setup.payment_method?.id;
  if (setup.status !== "succeeded" || !paymentMethod) { console.log(`  pula  ${label}: cartão não confirmado (${setup.status})`); skipped++; continue; }
  if (!confirm) { console.log(`  ok    ${label}: criaria a assinatura (cartão ${paymentMethod})`); ok++; continue; }

  const sub = await stripe.subscriptions.create(
    {
      customer: c.stripe_customer_id,
      items: [{ price: PRICE_ID }],
      default_payment_method: paymentMethod,
      trial_end: Math.floor(firstCharge.getTime() / 1000),
      proration_behavior: "none",
      metadata: { product: PRODUCT, commitment_session: c.stripe_checkout_session_id },
      payment_settings: { save_default_payment_method: "on_subscription" },
    },
    { idempotencyKey: `founding-activate-${c.stripe_checkout_session_id}` },
  );
  const { data: marked, error: markError } = await db.rpc("founding_commitment_activate", { p_session: c.stripe_checkout_session_id, p_subscription: sub.id, p_first_charge: firstCharge.toISOString() });
  if (markError) console.log(`  ⚠     ${label}: assinatura ${sub.id} criada, mas a reserva não foi marcada (${markError.message})`);
  else console.log(`  ativa ${label}: assinatura ${sub.id}${marked ? "" : " (a reserva já não estava 'reserved')"}`);
  ok++;
}
console.log(`\n${ok} ${confirm ? "ativada(s)" : "pronta(s) para ativar"} · ${skipped} pulada(s)`);
if (!confirm && pending.length) console.log(`E-mails para o aviso de lançamento:\n${pending.map((c) => c.email).filter(Boolean).join(", ")}`);
