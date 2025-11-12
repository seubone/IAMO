/**
 * Server-side JWT Debug Utility
 * Helps verify JWT tokens and identify secret mismatches
 */

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

interface DecodedJWT {
  payload: any;
  valid: boolean;
  error?: string;
  expiresIn?: string;
}

/**
 * Safely decode and verify a JWT token
 */
export function verifyToken(token: string, secret?: string): DecodedJWT {
  try {
    const secretToUse = secret || JWT_SECRET;

    // Verify the token
    const decoded = jwt.verify(token, secretToUse);

    // Calculate expiration
    let expiresIn: string | undefined;
    if (typeof decoded === "object" && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const secondsLeft = decoded.exp - now;

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
      payload: decoded,
      valid: true,
      expiresIn,
    };
  } catch (error: any) {
    let errorMsg = error.message;

    if (error.name === "TokenExpiredError") {
      errorMsg = "Token has expired";
    } else if (error.name === "JsonWebTokenError") {
      if (errorMsg.includes("secret not matched")) {
        errorMsg = `Invalid signature - secret doesn't match. Expected: "${JWT_SECRET.substring(0, 20)}..."`;
      } else {
        errorMsg = `Invalid token format: ${errorMsg}`;
      }
    }

    return {
      payload: null,
      valid: false,
      error: errorMsg,
    };
  }
}

/**
 * Decode token without verification (for inspection)
 */
export function decodeTokenWithoutVerification(token: string): any {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
}

/**
 * Log JWT verification result with proper formatting
 */
export function logTokenVerification(
  token: string,
  context: string = "JWT Verification"
): void {
  const result = verifyToken(token);

  console.log(`\n🔐 ${context}`);
  console.log("=".repeat(50));

  if (result.valid) {
    console.log("✅ Token is VALID");
    console.log(`📝 User ID: ${result.payload.id || result.payload.sub || "N/A"}`);
    console.log(`📧 Email: ${result.payload.email || "N/A"}`);
    console.log(`⏰ ${result.expiresIn}`);
  } else {
    console.log(`❌ Token is INVALID`);
    console.log(`📌 Error: ${result.error}`);
    console.log(`🔑 Current JWT_SECRET: "${JWT_SECRET.substring(0, 30)}..."`);

    // Try to decode without verification to show structure
    const decoded = decodeTokenWithoutVerification(token);
    if (decoded) {
      console.log(`\n📋 Token Structure (unverified):`);
      console.log(`   Header: ${JSON.stringify(decoded.header)}`);
      console.log(
        `   Payload: ${JSON.stringify(decoded.payload).substring(0, 100)}...`
      );
    }
  }

  console.log("=".repeat(50) + "\n");
}

/**
 * Check if a secret would work with a token
 */
export function testSecretAgainstToken(
  token: string,
  testSecret: string
): boolean {
  try {
    jwt.verify(token, testSecret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Display current JWT configuration
 */
export function displayJWTConfig(): void {
  console.log("\n🔐 JWT Configuration");
  console.log("=".repeat(50));
  console.log(`JWT_SECRET: "${JWT_SECRET.substring(0, 30)}..."`);
  console.log(`JWT_SECRET Length: ${JWT_SECRET.length} characters`);
  console.log(`JWT_SECRET Set: ${process.env.JWT_SECRET ? "✅ Yes" : "❌ No"}`);
  console.log(`Token Expiration: 7 days`);
  console.log("=".repeat(50) + "\n");
}

/**
 * Verify a token from a request (for debugging endpoints)
 */
export function verifyRequestToken(authHeader?: string): DecodedJWT {
  if (!authHeader) {
    return {
      payload: null,
      valid: false,
      error: "No Authorization header provided",
    };
  }

  const token = authHeader.replace("Bearer ", "");
  return verifyToken(token);
}
