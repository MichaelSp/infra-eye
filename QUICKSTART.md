# Quick Start Guide

This guide will help you get Infra Eye up and running in minutes.

## 1. Prerequisites Check

Ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ Access to a Kubernetes cluster
- ✅ kubectl configured (`kubectl cluster-info`)

## 2. Install Dependencies

```bash
cd infra-eye
npm install
```

## 3. Set KUBECONFIG

The application needs to connect to your Kubernetes cluster. Set the `KUBECONFIG` environment variable:

```bash
# If using default kubeconfig location (~/.kube/config)
export KUBECONFIG=~/.kube/config

# Or specify a custom location
export KUBECONFIG=/path/to/your/kubeconfig
```

**Verify your connection:**
```bash
kubectl get nodes
```

## 4. Start the Development Server

```bash
npm run dev
```

The application will start at: **http://localhost:5173**

## 5. Open in Browser

Navigate to http://localhost:5173 and you should see:
- A "Connected" status badge (green)
- Real-time Flux resources (if they exist in your cluster)
- Live updates when resources change

## Testing the Real-time Updates

### If you have Flux CD installed:

1. Create or modify a HelmRelease:
```bash
kubectl apply -f - <<EOF
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: test-release
  namespace: default
spec:
  interval: 1m
  chart:
    spec:
      chart: nginx
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: stable
EOF
```

2. Watch it appear in the dashboard immediately!

3. Delete it:
```bash
kubectl delete helmrelease test-release -n default
```

4. Watch it disappear from the dashboard in real-time!

### If you DON'T have Flux CD installed:

You can test with basic Kubernetes resources. Update `src/routes/+page.svelte` to watch pods instead:

```typescript
// Replace the Flux stores with:
const pods = createK8sResourceStore('pods');
const deployments = createK8sResourceStore('deployments');
const services = createK8sResourceStore('services');

// Update the allResources derived store accordingly
```

Then create a test pod:
```bash
kubectl run test-pod --image=nginx --restart=Never
```

## Troubleshooting

### "Failed to load kubeconfig"
- Check that KUBECONFIG is set: `echo $KUBECONFIG`
- Verify the file exists: `ls -la $KUBECONFIG`
- Test kubectl works: `kubectl get nodes`

### "Connection lost" or showing errors
- Check if your cluster is accessible: `kubectl cluster-info`
- Verify RBAC permissions (see main README.md)
- Check server logs in the terminal for details

### Dashboard shows "No resources found"
- Verify resources exist: `kubectl get helmreleases -A`
- If no Flux resources exist, modify the code to watch pods/deployments
- Check browser console (F12) for errors

### Port 5173 is already in use
```bash
# Use a different port
npm run dev -- --port 3000
```

## What's Happening Under the Hood?

1. **Frontend** connects to `/api/watch/helmreleases` using EventSource (SSE)
2. **Backend** creates a Watch on the Kubernetes API server
3. **Kubernetes** sends ADDED/MODIFIED/DELETED events
4. **Backend** forwards these to all connected clients via SSE
5. **Frontend** updates the UI reactively in real-time

## Next Steps

- Read the main [README.md](./README.md) for detailed documentation
- Add support for custom resource types
- Deploy to production (see Deployment section in README)
- Customize the UI components

## Common Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build

# Type checking
npm run check              # Type check
npm run check:watch        # Type check in watch mode

# Formatting
npm run format             # Format code
npm run lint               # Check formatting
```

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review the main README.md
3. Check browser console (F12) for client-side errors
4. Check terminal for server-side logs
5. Verify Kubernetes connectivity with kubectl

Happy monitoring! 🚀
