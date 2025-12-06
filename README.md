# Infra Eye - Real-time Kubernetes GitOps Dashboard

A SvelteKit-based dashboard for monitoring Kubernetes resources in real-time, with a focus on Flux CD GitOps resources.

## Features

- 🔄 **Real-time Updates**: Uses Server-Sent Events (SSE) to stream Kubernetes resource changes instantly
- 🎯 **Flux CD Focus**: Pre-configured to watch HelmReleases, Kustomizations, OCIRepositories, and GitRepositories
- 🔌 **Extensible**: Easy to add support for additional Kubernetes resource types
- 🔐 **Secure**: Uses KUBECONFIG environment variable for cluster authentication
- 🚀 **Auto-reconnect**: Automatic reconnection with exponential backoff on connection failures
- 📊 **Live Statistics**: Real-time resource counts and status indicators

## Architecture

```
┌─────────────────────────────────────┐
│  Browser (Svelte Components)       │
│  - EventSource connects to SSE     │
│  - Receives ADDED/MODIFIED/DELETED │
│  - Updates reactive stores         │
└─────────────┬───────────────────────┘
              │ SSE stream
┌─────────────▼───────────────────────┐
│  SvelteKit Server                   │
│  /api/watch/[kind]                  │
│  - SSE endpoint                     │
│  - Broadcasts K8s events            │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  K8s Informer Manager               │
│  (@kubernetes/client-node)          │
│  - Watch API                        │
│  - Auto-reconnect                   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Kubernetes API Server              │
└─────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+ or Bun
- Access to a Kubernetes cluster
- KUBECONFIG file or in-cluster service account

## Installation

```bash
npm install
# or
bun install
```

## Configuration

### Setting up KUBECONFIG

The application uses the `KUBECONFIG` environment variable to connect to your Kubernetes cluster.

**Option 1: Export KUBECONFIG**
```bash
export KUBECONFIG=/path/to/your/kubeconfig
npm run dev
```

**Option 2: Use default kubeconfig location**
```bash
# The app will automatically use ~/.kube/config if KUBECONFIG is not set
npm run dev
```

**Option 3: In-cluster deployment**
If running inside a Kubernetes cluster, the app will automatically use the service account token.

### RBAC Requirements

The application requires read access to the resources you want to monitor. Example RBAC configuration:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: infra-eye-reader
rules:
  # Flux CD resources
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["ocirepositories", "gitrepositories"]
    verbs: ["get", "list", "watch"]
  # Core resources (optional)
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: infra-eye-reader-binding
subjects:
  - kind: ServiceAccount
    name: infra-eye
    namespace: default
roleRef:
  kind: ClusterRole
  name: infra-eye-reader
  apiGroup: rbac.authorization.k8s.io
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## Adding Support for New Resource Types

To watch additional Kubernetes resource types, update the informer manager:

**1. Add the resource path in `src/lib/server/k8s-informers.ts`:**

```typescript
private getWatchPath(kind: string, namespace?: string): string {
  const kindLower = kind.toLowerCase();
  
  // Add your custom resource
  if (kindLower === 'myresource' || kindLower === 'myresources') {
    return namespace
      ? `/apis/mygroup.example.com/v1/namespaces/${namespace}/myresources`
      : '/apis/mygroup.example.com/v1/myresources';
  }
  
  // ... existing resources
}
```

**2. Create a store in your component:**

```typescript
import { createK8sResourceStore } from '$lib/stores/k8s-resources';

const myResources = createK8sResourceStore('myresources');
// Or with namespace filtering:
const myResourcesInNs = createK8sResourceStore('myresources', 'my-namespace');
```

## API Endpoints

### GET `/api/watch/[kind]`

Stream resource updates via Server-Sent Events.

**Parameters:**
- `kind` (path): Resource kind to watch (e.g., `helmreleases`, `pods`, `deployments`)
- `namespace` (query, optional): Filter by namespace

**Response:**
Returns a text/event-stream with the following event types:

- `connected`: Initial connection confirmation
- `info`: Informational messages (e.g., cluster context)
- `resource`: Resource events (ADDED, MODIFIED, DELETED)
- `error`: Error messages

**Example:**
```javascript
const eventSource = new EventSource('/api/watch/helmreleases?namespace=flux-system');

eventSource.addEventListener('resource', (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data.resource);
});
```

## Supported Resource Types

### Flux CD Resources
- `helmreleases` - Helm releases managed by Flux
- `kustomizations` - Kustomize overlays managed by Flux
- `ocirepositories` - OCI repositories
- `gitrepositories` - Git repositories

### Core Kubernetes Resources
- `pods` - Pods
- `deployments` - Deployments
- `services` - Services
- `namespaces` - Namespaces

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "build"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: infra-eye
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: infra-eye
  template:
    metadata:
      labels:
        app: infra-eye
    spec:
      serviceAccountName: infra-eye
      containers:
        - name: infra-eye
          image: your-registry/infra-eye:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
          # KUBECONFIG not needed when using in-cluster service account
---
apiVersion: v1
kind: Service
metadata:
  name: infra-eye
  namespace: default
spec:
  selector:
    app: infra-eye
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: infra-eye
  namespace: default
spec:
  rules:
    - host: infra-eye.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: infra-eye
                port:
                  number: 80
```

## Troubleshooting

### Connection errors

**Issue**: "Failed to load kubeconfig"
- Ensure `KUBECONFIG` environment variable points to a valid kubeconfig file
- Verify the kubeconfig file has proper permissions (readable)
- Check that the current context in kubeconfig is set correctly

**Issue**: "Connection lost" or "Connection failed after multiple retries"
- Verify network connectivity to the Kubernetes API server
- Check RBAC permissions for the service account
- Ensure the API server is accessible and not rate-limiting

### No resources showing

**Issue**: Dashboard shows "No resources found"
- Verify that the resources actually exist in your cluster: `kubectl get helmreleases -A`
- Check browser console for connection errors
- Verify RBAC permissions allow watching the resource type
- Check server logs for watch errors

### High memory usage

**Issue**: Application consuming too much memory
- Limit the number of namespaces being watched
- Use namespace filters in the store creation
- Consider increasing the resource limits in Kubernetes deployment

## Performance Considerations

- Each client connection creates a separate SSE stream
- The server maintains watches for each unique resource type/namespace combination
- Watches are automatically cleaned up when no clients are subscribed
- Use namespace filtering to reduce the number of resources being watched

## Security Best Practices

1. **Least Privilege**: Grant only the minimum required RBAC permissions
2. **Network Policies**: Restrict access to the API server
3. **Authentication**: Add authentication/authorization to the dashboard (not included by default)
4. **TLS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting for API endpoints

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
