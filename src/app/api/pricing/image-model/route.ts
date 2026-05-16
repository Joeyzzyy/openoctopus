import { NextResponse } from "next/server";
import {
  formatPricingLabel,
  getMarketingImagePricing,
} from "@/lib/marketing-pricing";

export async function GET() {
  try {
    const pricing = await getMarketingImagePricing();

    return NextResponse.json({
      name: pricing.name,
      billingUnit: pricing.billingUnit,
      costUsd: pricing.costUsd,
      sellUsd: pricing.sellUsd,
      costLabel:
        pricing.costUsd === null
          ? "Unavailable"
          : formatPricingLabel(pricing.costUsd, pricing.billingUnit),
      sellLabel: pricing.sellLabel,
      priceTiers: pricing.priceTiers,
    });
  } catch (error) {
    console.error("Failed to load marketing pricing", error);

    return NextResponse.json(
      { error: "Failed to load pricing" },
      { status: 500 }
    );
  }
}
