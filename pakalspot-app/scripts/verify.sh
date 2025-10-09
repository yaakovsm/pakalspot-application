#!/bin/bash

# PakalSpot Helm Chart Verification Script
# This script performs smoke tests to verify the deployment

set -e

NAMESPACE=${1:-pakalspot}
RELEASE_NAME=${2:-pakalspot}

echo "🔍 Verifying PakalSpot deployment in namespace: $NAMESPACE"
echo "📦 Release name: $RELEASE_NAME"
echo ""

# Check if namespace exists
echo "1. Checking namespace..."
if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo "✅ Namespace $NAMESPACE exists"
else
    echo "❌ Namespace $NAMESPACE does not exist"
    exit 1
fi

# Check pods status
echo ""
echo "2. Checking pod status..."
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart

# Check if all pods are ready
READY_PODS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart --field-selector=status.phase=Running --no-headers | wc -l)
TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart --no-headers | wc -l)

if [ "$READY_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    echo "✅ All $TOTAL_PODS pods are running"
else
    echo "❌ Only $READY_PODS out of $TOTAL_PODS pods are running"
    echo "Pod details:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart
fi

# Check services
echo ""
echo "3. Checking services..."
kubectl get svc -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart

# Check if services have endpoints
echo ""
echo "4. Checking service endpoints..."
kubectl get ep -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart

# Check ingress
echo ""
echo "5. Checking ingress..."
if kubectl get ingress -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart >/dev/null 2>&1; then
    kubectl get ingress -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart
    echo "✅ Ingress configured"
else
    echo "⚠️  No ingress found"
fi

# Check frontend logs (no build commands)
echo ""
echo "6. Checking frontend logs (should only show nginx logs)..."
FRONTEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=frontend --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$FRONTEND_POD" ]; then
    echo "Frontend pod: $FRONTEND_POD"
    kubectl logs "$FRONTEND_POD" -n "$NAMESPACE" --tail=10
else
    echo "❌ No frontend pod found"
fi

# Check backend health endpoint
echo ""
echo "7. Testing backend health endpoint..."
BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=backend --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$BACKEND_POD" ]; then
    echo "Backend pod: $BACKEND_POD"
    if kubectl exec "$BACKEND_POD" -n "$NAMESPACE" -- curl -f http://localhost:8000/api/health >/dev/null 2>&1; then
        echo "✅ Backend health check passed"
    else
        echo "❌ Backend health check failed"
    fi
else
    echo "❌ No backend pod found"
fi

# Check if env-config.js is properly mounted
echo ""
echo "8. Checking frontend env-config.js..."
if [ -n "$FRONTEND_POD" ]; then
    if kubectl exec "$FRONTEND_POD" -n "$NAMESPACE" -- test -f /usr/share/nginx/html/env-config.js; then
        echo "✅ env-config.js is mounted"
        kubectl exec "$FRONTEND_POD" -n "$NAMESPACE" -- cat /usr/share/nginx/html/env-config.js
    else
        echo "❌ env-config.js is not mounted"
    fi
else
    echo "❌ Cannot check env-config.js - no frontend pod"
fi

# Check image tags (no latest)
echo ""
echo "9. Checking image tags (should not use 'latest')..."
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=pakalspot-chart -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}' | while read -r pod images; do
    if echo "$images" | grep -q ":latest"; then
        echo "❌ Pod $pod is using 'latest' tag"
    else
        echo "✅ Pod $pod is using versioned tags"
    fi
done

echo ""
echo "🎉 Verification complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the application at http://pakalspot.local (or port-forward)"
echo "2. Verify API calls work: curl http://pakalspot.local/api/health"
echo "3. Check browser console for Google Maps API key errors"
echo "4. Test geolocation functionality if using HTTPS"