import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function readAmountUsdFromSession(session: Stripe.Checkout.Session) {
  if (typeof session.amount_total === "number") {
    return session.amount_total / 100;
  }

  const metadataAmount = session.metadata?.amountUsd;
  if (metadataAmount) {
    const parsed = Number(metadataAmount);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const workspaceId = session.metadata?.workspaceId ?? null;
  const userId = session.metadata?.userId ?? null;
  const amountUsd = readAmountUsdFromSession(session);

  if (!workspaceId || !amountUsd) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("wallet_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .contains("metadata", { stripe_checkout_session_id: session.id })
    .limit(1);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if ((existingRows ?? []).length > 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { error: insertError } = await supabase.from("wallet_transactions").insert({
    workspace_id: workspaceId,
    entry_type: "topup",
    amount_delta: amountUsd,
    balance_after: null,
    description: "Stripe top-up",
    reference_id: null,
    metadata: {
      stripe_event_id: event.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_invoice_id: typeof session.invoice === "string" ? session.invoice : null,
      amount_usd: amountUsd,
    },
    created_by: userId,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
