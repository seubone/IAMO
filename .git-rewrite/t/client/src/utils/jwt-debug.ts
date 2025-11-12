/**
 * JWT Debug Utility
 * Helps identify JWT token issues and secret mismatches
 */

interface JWTPayload {
  id?: string;
  email?: string;
  role?: string;
  sub?: string;
  name?: string;
  admin?: boolean;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

interface JWTHeader {
  alg: string;
  typ: string;
  [key: string]: any;
}

interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  isValid: boolean;
  expiresIn?: string;
}

/**
 * Decode JWT without verification (safe - just base64 decode)
 */
export function decodeJWT(token: string): DecodedJWT | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      console.error("❌ Invalid JWT format - should have 3 parts separated by dots");
      return null;
    }

    const [headerB64, payloadB64, signature] = parts;

    // Decode header
    const header = JSON.parse(atob(headerB64)) as JWTHeader;

    // Decode payload
    const payload = JSON.parse(atob(payloadB64)) as JWTPayload;

    // Calculate expiration
    let expiresIn: string | undefined;
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      const secondsLeft = payload.exp - now;

      if (secondsLeft < 0) {
        expiresIn = "🔴 EXPIRED";
      } else if (secondsLeft < 3600) {
        expiresIn = `⚠️ Expires in ${Math.floor(secondsLeft / 60)} minutes`;
      } else {
        const daysLeft = Math.floor(secondsLeft / 86400);
        expiresIn = `✅ Valid for ${daysLeft} days`;
      }
    }

    return {
      header,
      payload,
      signature,
      isValid: true,
      expiresIn,
    };
  } catch (error) {
    console.error("❌ Failed to decode JWT:", error);
    return null;
  }
}

/**
 * Get the currently stored token from localStorage
 */
export function getStoredToken(): string | null {
  return localStorage.getItem("auth_token");
}

/**
 * Display JWT info in a readable format
 */
export function displayJWTInfo(): void {
  const token = getStoredToken();

  if (!token) {
    console.log("⚠️ No token found in localStorage");
    return;
  }

  console.log("\n📋 ==============================================");
  console.log("📋 JWT TOKEN DEBUG INFORMATION");
  console.log("📋 ==============================================\n");

  const decoded = decodeJWT(token);

  if (!decoded) {
    console.error("❌ Failed to decode token");
    return;
  }

  console.log("✅ Token Structure:");
  console.log("  Header:", decoded.header);
  console.log("  Payload:", decoded.payload);
  console.log(`  Signature: ${decoded.signature.substring(0, 20)}...`);

  if (decoded.expiresIn) {
    console.log(`\n⏰ Expiration: ${decoded.expiresIn}`);
  }

  console.log("\n📝 Token Claims:");
  console.log(`  User ID: ${decoded.payload.id || decoded.payload.sub || "N/A"}`);
  console.log(`  Email: ${decoded.payload.email || decoded.payload.name || "N/A"}`);
  console.log(`  Role: ${decoded.payload.role || "N/A"}`);
  console.log(`  Admin: ${decoded.payload.admin || false}`);

  console.log("\n🔐 To verify this token on jwt.io:");
  console.log(`  1. Go to https://jwt.io`);
  console.log(`  2. Paste this token in the "Encoded" field:`);
  console.log(`     ${token}`);
  console.log(`  3. In the "Secret" field, enter your JWT_SECRET`);
  console.log(`  4. Check if "Signature Verified" shows green`);

  console.log("\n📋 ==============================================\n");
}

/**
 * Check token validity and suggest actions
 */
export function checkTokenValidity(): {
  isValid: boolean;
  suggestions: string[];
} {
  const token = getStoredToken();
  const suggestions: string[] = [];

  if (!token) {
    return {
      isValid: false,
      suggestions: [
        "❌ No token found",
        "👉 Action: Login again to get a new token",
      ],
    };
  }

  const decoded = decodeJWT(token);

  if (!decoded) {
    return {
      isValid: false,
      suggestions: [
        "❌ Token is malformed",
        "👉 Action: Clear localStorage and login again",
        "👉 Command: localStorage.removeItem('auth_token')",
      ],
    };
  }

  let isValid = true;

  // Check expiration
  if (decoded.payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp < now) {
      isValid = false;
      suggestions.push(
        "❌ Token is expired",
        "👉 Action: Login again to get a new token"
      );
    } else if (decoded.payload.exp - now < 3600) {
      suggestions.push(
        "⚠️ Token expires soon (within 1 hour)",
        "👉 Action: Consider logging in again to refresh token"
      );
    }
  }

  // Check required claims
  if (!decoded.payload.id && !decoded.payload.sub) {
    isValid = false;
    suggestions.push(
      "❌ Token missing user ID (id or sub claim)",
      "👉 Action: Regenerate token by logging in"
    );
  }

  if (isValid && suggestions.length === 0) {
    suggestions.push("✅ Token appears valid");
  }

  return { isValid, suggestions };
}

/**
 * Display a complete diagnostic report
 */
export function runDiagnostics(): void {
  console.clear();
  console.log("\n🔍 RUNNING JWT DIAGNOSTICS...\n");

  // Show token info
  displayJWTInfo();

  // Check validity
  const validity = checkTokenValidity();
  console.log("🔍 Validation Results:");
  validity.suggestions.forEach((suggestion) => console.log(`  ${suggestion}`));

  // Show localStorage info
  console.log("\n📦 LocalStorage Info:");
  const authToken = localStorage.getItem("auth_token");
  console.log(`  auth_token stored: ${authToken ? "✅ Yes" : "❌ No"}`);
  console.log(`  Token length: ${authToken?.length || 0} characters`);

  // Show environment info
  console.log("\n🌐 Environment Info:");
  console.log(`  URL: ${window.location.href}`);
  console.log(`  Protocol: ${window.location.protocol}`);
  console.log(`  Host: ${window.location.host}`);

  console.log(
    "\n💡 Next steps: Check the suggestions above and follow the recommended actions."
  );
}

/**
 * Export token info for sharing/debugging (censored)
 */
export function exportTokenInfo(censorSensitiveData = true): string {
  const token = getStoredToken();
  if (!token) {
    return "No token found";
  }

  const decoded = decodeJWT(token);
  if (!decoded) {
    return "Failed to decode token";
  }

  const censoredPayload = censorSensitiveData
    ? {
        ...decoded.payload,
        email: decoded.payload.email
          ? decoded.payload.email.replace(/(.{2}).*(@)/, "$1***$2") + "..."
          : "***",
        id: "***",
        sub: "***",
      }
    : decoded.payload;

  return JSON.stringify(
    {
      header: decoded.header,
      payload: censoredPayload,
      expiresIn: decoded.expiresIn,
      tokenLength: token.length,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );
}
