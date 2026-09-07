// OpenID Connect discovery (for future mail / service clients)
export async function GET() {
  const issuer = process.env.APP_URL || "http://localhost:3100";
  return Response.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/consent`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    scopes_supported: ["openid", "profile", "email", "phone"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
  });
}
