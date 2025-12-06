# OIDC Authentication Setup

This application uses OpenID Connect (OIDC) for authentication.

## Environment Variables

Create a `.env` file in the `infra-eye` directory with the following variables:

```bash
# OIDC Configuration
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_DISCOVERY_URL=https://your-oidc-provider.com/.well-known/openid-configuration

# Auth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-random-secret-here
```

## Setup Steps

1. **Register OAuth Application** with your OIDC provider:
   - Set the redirect URI to: `http://localhost:5173/auth/callback/oidc` (dev) or `https://your-domain.com/auth/callback/oidc` (production)
   - Request scopes: `openid`, `profile`, `email`
   - Note down the Client ID and Client Secret

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Generate Auth Secret**:
   ```bash
   openssl rand -base64 32
   ```
   Add this to your `.env` file as `AUTH_SECRET`

4. **Install Dependencies** (if not already done):
   ```bash
   npm install
   ```

5. **Run the Application**:
   ```bash
   npm run dev
   ```

6. **Access the Application**:
   - Navigate to `http://localhost:5173`
   - You'll be redirected to the login page
   - Click "Sign in with OIDC" to authenticate

## Supported OIDC Providers

This setup works with any standard OIDC provider:
- PocketID
- Keycloak
- Authentik
- Auth0
- Okta
- Azure AD
- Google OAuth
- GitHub OAuth (via OIDC)

## Production Deployment

For production:

1. Set environment variables in your deployment:
   ```bash
   OAUTH_CLIENT_ID=production-client-id
   OAUTH_CLIENT_SECRET=production-secret
   OAUTH_DISCOVERY_URL=https://auth.yourdomain.com/.well-known/openid-configuration
   AUTH_SECRET=production-random-secret
   ```

2. Update the redirect URI in your OIDC provider to match your production domain

3. Ensure `AUTH_SECRET` is a strong, randomly generated value

## Troubleshooting

### Login redirects in a loop
- Check that `OAUTH_DISCOVERY_URL` is accessible
- Verify the Client ID and Secret are correct
- Ensure the redirect URI is registered in your OIDC provider

### "Invalid credentials" error
- Double-check `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`
- Verify the discovery URL returns valid JSON

### Session not persisting
- Make sure `AUTH_SECRET` is set and is the same across restarts
- Check browser cookies are enabled

## Security Notes

- Never commit `.env` files to version control
- Use strong, random values for `AUTH_SECRET`
- Rotate secrets regularly
- Use HTTPS in production
- Configure appropriate CORS policies
