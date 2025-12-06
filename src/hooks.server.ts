import type { Provider } from "@auth/core/providers"
import { SvelteKitAuth } from "@auth/sveltekit"
import type { Handle } from "@sveltejs/kit"

// Check if OIDC is configured
const isOidcConfigured = Boolean(import.meta.env.OAUTH_DISCOVERY_URL)

// Custom OIDC provider configuration using environment variables
const oidcProvider: Provider = {
  id: "oidc",
  name: "OIDC",
  type: "oidc",
  wellKnown: import.meta.env.OAUTH_DISCOVERY_URL,
  clientId: import.meta.env.OAUTH_CLIENT_ID,
  clientSecret: import.meta.env.OAUTH_CLIENT_SECRET,
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
  console.log("[Auth] Set OAUTH_DISCOVERY_URL to enable OIDC authentication")
}
