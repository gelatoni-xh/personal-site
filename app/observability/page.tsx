import { permanentRedirect } from "next/navigation";

export default function LegacyObservabilityPage() {
  permanentRedirect("/zh/observability");
}
