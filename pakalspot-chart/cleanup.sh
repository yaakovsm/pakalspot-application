#!/bin/bash

# Simple cleanup script for Pakalspot namespace

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

NAMESPACE="pakalspot"

print_warning "This will delete the '$NAMESPACE' namespace and all resources."
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_status "Cancelled."
    exit 0
fi

print_status "Cleaning up namespace '$NAMESPACE'..."

# Uninstall Helm release if it exists
if helm list -n $NAMESPACE | grep -q pakalspot; then
    print_status "Uninstalling Helm release..."
    helm uninstall pakalspot -n $NAMESPACE
fi

# Delete namespace (this will delete all resources)
kubectl delete namespace $NAMESPACE 2>/dev/null || true

print_success "Cleanup completed!"
