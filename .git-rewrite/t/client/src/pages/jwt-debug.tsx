import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  decodeJWT,
  getStoredToken,
  checkTokenValidity,
  exportTokenInfo,
} from "@/utils/jwt-debug";

export default function JWTDebugPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [validity, setValidity] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    const token = getStoredToken();
    if (token) {
      const decoded = decodeJWT(token);
      setTokenInfo(decoded);

      const validityCheck = checkTokenValidity();
      setValidity(validityCheck);
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  if (!tokenInfo) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>JWT Debug - No Token Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">❌ No authentication token found</p>
            <p className="mt-2">Try logging in again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runDiagnosticsInConsole = () => {
    const { runDiagnostics } = require("@/utils/jwt-debug");
    runDiagnostics();
    alert("Diagnostics output sent to browser console (F12)");
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🔐 JWT Token Debugger</h1>
        <p className="text-gray-600 mt-2">
          Inspect and debug your JWT authentication token
        </p>
      </div>

      {/* Token Status */}
      <Card className={validity?.isValid ? "border-green-500" : "border-red-500"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {validity?.isValid ? "✅" : "❌"} Token Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {validity?.suggestions?.map((suggestion: string, idx: number) => (
              <p key={idx} className="text-sm">
                {suggestion}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expiration Info */}
      {tokenInfo?.expiresIn && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⏰ Expiration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-mono">{tokenInfo.expiresIn}</p>
            {tokenInfo.payload.exp && (
              <p className="text-sm text-gray-600 mt-2">
                Expires: {new Date(tokenInfo.payload.exp * 1000).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Header */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Header</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(tokenInfo.header, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Token Payload */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(tokenInfo.payload, null, 2)}
            </pre>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase">User ID</p>
                <p className="font-mono text-sm">
                  {tokenInfo.payload.id || tokenInfo.payload.sub || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase">Email</p>
                <p className="font-mono text-sm">
                  {tokenInfo.payload.email || tokenInfo.payload.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase">Role</p>
                <p className="font-mono text-sm">{tokenInfo.payload.role || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase">Admin</p>
                <p className="font-mono text-sm">
                  {tokenInfo.payload.admin ? "true" : "false"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle>🔒 Signature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              First 50 characters (for identification):
            </p>
            <code className="bg-gray-100 p-3 rounded block text-xs overflow-auto">
              {tokenInfo.signature.substring(0, 50)}...
            </code>
            <p className="text-xs text-gray-600 mt-2">
              Full signature length: {tokenInfo.signature.length} characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>🛠️ Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Copy Token (for jwt.io debugging)</p>
            <Button
              onClick={() => {
                const token = getStoredToken();
                if (token) {
                  copyToClipboard(token);
                }
              }}
              variant="outline"
              className="w-full"
            >
              {copied ? "✅ Copied!" : "📋 Copy Full Token"}
            </Button>
            <p className="text-xs text-gray-600">
              Paste at https://jwt.io to verify signature
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Export Token Info (censored)</p>
            <Button
              onClick={() => {
                const exported = exportTokenInfo(true);
                copyToClipboard(exported);
              }}
              variant="outline"
              className="w-full"
            >
              {copied ? "✅ Copied!" : "📤 Export Censored Info"}
            </Button>
            <p className="text-xs text-gray-600">
              Safe to share - sensitive data is masked
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Run Full Diagnostics</p>
            <Button
              onClick={runDiagnosticsInConsole}
              variant="outline"
              className="w-full"
            >
              🔍 Open Browser Console & Run Diagnostics
            </Button>
            <p className="text-xs text-gray-600">
              Press F12 to open DevTools to see detailed output
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Clear Token & Logout</p>
            <Button
              onClick={() => {
                localStorage.removeItem("auth_token");
                window.location.href = "/login";
              }}
              variant="destructive"
              className="w-full"
            >
              🚪 Logout & Clear Token
            </Button>
            <p className="text-xs text-gray-600">
              Use this if token is invalid and you can't login normally
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle>📚 How to Debug JWT Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Verify Signature on jwt.io</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Click "Copy Full Token" button above</li>
              <li>Go to https://jwt.io</li>
              <li>Paste token in "Encoded" field</li>
              <li>
                Enter your JWT_SECRET in the "Secret" field to verify signature
              </li>
              <li>
                If "Signature Verified" shows red, the secret doesn't match
              </li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. Check Token Expiration</h4>
            <p className="text-xs">
              If token is expired, logout and login again to get a fresh token
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. Common Issues</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Secret Mismatch</strong>: Server JWT_SECRET changed after
                token was issued
              </li>
              <li>
                <strong>Expired Token</strong>: Token is older than 7 days
              </li>
              <li>
                <strong>Malformed</strong>: Token doesn't have 3 parts (header.payload.signature)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">4. Solution</h4>
            <p className="text-xs">
              Click "Run Full Diagnostics" to see detailed information in browser
              console (press F12)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Browser Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>💾 Browser Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-3">
            Token is stored in localStorage with key: <code className="bg-gray-100 px-2 py-1 rounded">auth_token</code>
          </p>
          <p className="text-xs text-gray-600">
            Size: {getStoredToken()?.length || 0} characters
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
