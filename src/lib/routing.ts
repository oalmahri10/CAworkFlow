import { getActiveConfig } from "@/lib/config";
import type { RoutingMatrixPayload } from "@/lib/validation/config";

export type RoutingResolution =
  | { configured: true; tierLabel: string; approvalAuthorityLabel: string; requiredCapability: string }
  | { configured: false; message: string };

/**
 * Resolves which approval-authority tier an application's Approval-Routing
 * Exposure falls into, per the active ROUTING_MATRIX. Never infers a tier
 * from example amounts and never lets an unresolved authority be bypassed:
 * if there is no active matrix, or the exposure falls outside every
 * configured tier, or the matrix currency doesn't match the application's,
 * the caller must render "Approval authority TBC — routing matrix not
 * configured" rather than guessing. This never blocks the application from
 * sitting in the Approval Authority department queue — it only affects
 * which specific authority label is displayed.
 */
export async function resolveApprovalAuthorityTier(
  approvalRoutingExposureMinor: bigint,
  currency: string
): Promise<RoutingResolution> {
  const active = await getActiveConfig("ROUTING_MATRIX");
  if (!active) {
    return { configured: false, message: "Approval authority TBC — routing matrix not configured." };
  }

  let payload: RoutingMatrixPayload;
  try {
    payload = JSON.parse(active.payloadJson) as RoutingMatrixPayload;
  } catch {
    return { configured: false, message: "Approval authority TBC — routing matrix not configured." };
  }

  if (payload.currency.toUpperCase() !== currency.toUpperCase()) {
    return {
      configured: false,
      message: `Approval authority TBC — the configured routing matrix is denominated in ${payload.currency}, not ${currency}. Cross-currency routing is TBC.`,
    };
  }

  for (const tier of payload.tiers) {
    const min = BigInt(tier.minMinor);
    const max = tier.maxMinor === null ? null : BigInt(tier.maxMinor);
    if (approvalRoutingExposureMinor >= min && (max === null || approvalRoutingExposureMinor <= max)) {
      return {
        configured: true,
        tierLabel: tier.label,
        approvalAuthorityLabel: tier.approvalAuthorityLabel,
        requiredCapability: tier.requiredCapability,
      };
    }
  }

  return {
    configured: false,
    message: "Approval authority TBC — exposure falls outside every configured routing tier.",
  };
}
