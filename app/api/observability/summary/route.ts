import { NextResponse } from "next/server";
import { getObservabilityOverview } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET() {
  const overview = await getObservabilityOverview();

  return NextResponse.json(overview, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
