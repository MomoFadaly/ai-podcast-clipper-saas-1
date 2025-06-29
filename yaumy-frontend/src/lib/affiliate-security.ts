import { db } from "~/server/db";

interface SecurityCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  shouldBlock: boolean;
}

/**
 * Perform security checks on affiliate referrals to detect fraud
 */
export async function performAffiliateFraudCheck(
  affiliateId: string,
  ipAddress?: string,
  fingerprint?: string,
  sessionId?: string
): Promise<SecurityCheckResult> {
  const reasons: string[] = [];
  let isSuspicious = false;
  let shouldBlock = false;

  try {
    // Check 1: Multiple referrals from same IP in short time
    if (ipAddress) {
      const recentReferralsFromIP = await db.affiliateReferral.count({
        where: {
          affiliateId,
          ipAddress,
          firstTouchAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentReferralsFromIP > 5) {
        reasons.push("Multiple referrals from same IP address");
        isSuspicious = true;
      }

      if (recentReferralsFromIP > 10) {
        shouldBlock = true;
      }
    }

    // Check 2: Multiple referrals with same fingerprint
    if (fingerprint) {
      const referralsWithFingerprint = await db.affiliateReferral.count({
        where: {
          affiliateId,
          fingerprint,
          firstTouchAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      if (referralsWithFingerprint > 3) {
        reasons.push("Multiple referrals with same browser fingerprint");
        isSuspicious = true;
      }

      if (referralsWithFingerprint > 5) {
        shouldBlock = true;
      }
    }

    // Check 3: Self-referral detection (affiliate referring themselves)
    const affiliate = await db.affiliate.findUnique({
      where: { id: affiliateId },
      include: { user: true },
    });

    if (affiliate && sessionId) {
      // Check if the session belongs to the affiliate user
      const sessionFromAffiliate = await db.analyticsSession.findFirst({
        where: {
          sessionId,
          userId: affiliate.userId,
        },
      });

      if (sessionFromAffiliate) {
        reasons.push("Self-referral detected");
        isSuspicious = true;
        shouldBlock = true;
      }
    }

    // Check 4: Rapid signup/conversion pattern
    const recentConversions = await db.affiliateReferral.count({
      where: {
        affiliateId,
        status: "CONVERTED",
        firstPaymentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentConversions > 10) {
      reasons.push("Unusually high conversion rate in short time");
      isSuspicious = true;
    }

    // Check 5: Geographic clustering (simplified)
    if (ipAddress) {
      const recentReferralsFromRegion = await db.affiliateReferral.count({
        where: {
          affiliateId,
          geoInfo: {
            path: ["country"],
            equals: "US", // Simplified - in practice, would extract country from IP
          },
          firstTouchAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      // If all traffic is from same region and high volume, flag as suspicious
      if (recentReferralsFromRegion > 20) {
        reasons.push("High volume of referrals from single geographic region");
        isSuspicious = true;
      }
    }

    return {
      isSuspicious,
      reasons,
      shouldBlock,
    };
  } catch (error) {
    console.error("Error performing affiliate fraud check:", error);
    return {
      isSuspicious: false,
      reasons: ["Error performing security check"],
      shouldBlock: false,
    };
  }
}

/**
 * Update referral with security check results
 */
export async function updateReferralSecurityStatus(
  referralId: string,
  securityResult: SecurityCheckResult
) {
  if (securityResult.isSuspicious) {
    await db.affiliateReferral.update({
      where: { id: referralId },
      data: {
        isSuspicious: true,
        suspiciousReason: securityResult.reasons.join("; "),
      },
    });
  }
}

/**
 * Block suspicious affiliate activity
 */
export async function blockSuspiciousAffiliate(
  affiliateId: string,
  reason: string
) {
  await db.affiliate.update({
    where: { id: affiliateId },
    data: {
      status: "SUSPENDED",
      notes: `Auto-suspended: ${reason}`,
    },
  });

  // Mark recent referrals as suspicious
  await db.affiliateReferral.updateMany({
    where: {
      affiliateId,
      firstTouchAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    data: {
      isSuspicious: true,
      suspiciousReason: "Affiliate auto-suspended for suspicious activity",
    },
  });
}