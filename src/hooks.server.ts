import type { Provider } from "@auth/core/providers"
import { SvelteKitAuth } from "@auth/sveltekit"
import type { Handle } from "@sveltejs/kit"
import { readFileSync } from "node:fs"
import tls from "node:tls"

// Check if OIDC is configured
const isOidcConfigured = Boolean(process.env.OAUTH_ISSUER_URL)

function configureOidcCaTrust(): void {
  const inlineCa = process.env.OAUTH_CA_CERT_PEM?.trim()
  const caFile = process.env.OAUTH_CA_CERT_FILE?.trim()

  if (!inlineCa && !caFile) return

  const extraCa = inlineCa || readFileSync(caFile as string, "utf8").trim()
  if (!extraCa) return

  tls.setDefaultCACertificates([...tls.getCACertificates("default"), extraCa])

  console.log("[Auth] Loaded additional OIDC CA certificate")
}

if (isOidcConfigured) {
  configureOidcCaTrust()
}

// Custom OIDC provider configuration using environment variables
const oidcProvider: Provider = {
  id: "oidc",
  name: "OIDC",
  type: "oidc",
  issuer: process.env.OAUTH_ISSUER_URL,
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  checks: ["pkce", "state"],
  authorization: { params: { scope: "openid profile email" } },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name ?? profile.preferred_username,
      email: profile.email,
      image: profile.picture
    }
  }
}

// Static session for development when OIDC is not configured
const staticSession = {
  user: {
    id: "dev-user",
    name: "Development User",
    email: "dev@localhost",
    image: null
  },
  expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
}

// Create handle based on configuration
export const handle: Handle = isOidcConfigured
  ? SvelteKitAuth({
      providers: [oidcProvider],
      trustHost: true,
      secret:
        process.env.AUTH_SECRET || "default-dev-secret-change-in-production",
      callbacks: {
        async session({ session, token }) {
          if (token?.sub) {
            session.user.id = token.sub
          }
          return session
        }
      }
    }).handle
  : async ({ event, resolve }) => {
      // Provide static session when OIDC is not configured
      event.locals.auth = async () => staticSession
      return resolve(event)
    }

// Log configuration status on startup
if (isOidcConfigured) {
  console.log("[Auth] OIDC authentication enabled")
} else {
  console.log("[Auth] OIDC not configured - using static development session")
  console.log("[Auth] Set OAUTH_ISSUER_URL to enable OIDC authentication")
}
