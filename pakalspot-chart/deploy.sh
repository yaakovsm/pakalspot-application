#!/bin/bash

# Pakalspot Helm Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environment: development, staging, production
# Action: install, upgrade, uninstall, status

set -e

ENVIRONMENT=${1:-development}
ACTION=${2:-install}
CHART_PATH="./"
RELEASE_NAME="pakalspot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if helm is installed
check_helm() {
    if ! command -v helm &> /dev/null; then
        print_error "Helm is not installed. Please install Helm first."
        exit 1
    fi
    print_success "Helm is installed: $(helm version --short)"
}

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    # Check kubectl version without --short flag for compatibility
    local kubectl_version=$(kubectl version --client 2>/dev/null | grep -o 'GitVersion:"[^"]*"' | cut -d'"' -f2 || echo "unknown")
    print_success "kubectl is installed: $kubectl_version"
}

# Function to validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            print_success "Environment: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Function to validate action
validate_action() {
    case $ACTION in
        install|upgrade|uninstall|status|dry-run)
            print_success "Action: $ACTION"
            ;;
        *)
            print_error "Invalid action: $ACTION"
            print_error "Valid actions: install, upgrade, uninstall, status, dry-run"
            exit 1
            ;;
    esac
}

# Function to install/upgrade the chart
deploy_chart() {
    local values_file="values-${ENVIRONMENT}.yaml"
    
    if [ ! -f "$values_file" ]; then
        print_error "Values file not found: $values_file"
        exit 1
    fi
    
    print_status "Deploying chart with values from: $values_file"
    
    case $ACTION in
        install)
            # Use --create-namespace to ensure namespace exists
            helm install $RELEASE_NAME $CHART_PATH \
                --namespace pakalspot \
                --create-namespace \
                --values $values_file \
                --wait \
                --timeout 10m
            ;;
        upgrade)
            helm upgrade $RELEASE_NAME $CHART_PATH \
                --namespace pakalspot \
                --values $values_file \
                --wait \
                --timeout 10m
            ;;
        dry-run)
            helm install $RELEASE_NAME $CHART_PATH \
                --namespace pakalspot \
                --create-namespace \
                --values $values_file \
                --dry-run \
                --debug
            ;;
    esac
    
    print_success "Chart deployment completed"
}

# Function to uninstall the chart
uninstall_chart() {
    print_warning "Uninstalling chart: $RELEASE_NAME"
    helm uninstall $RELEASE_NAME --namespace pakalspot
    print_success "Chart uninstalled"
}

# Function to show status
show_status() {
    print_status "Helm release status:"
    helm status $RELEASE_NAME --namespace pakalspot
    
    print_status "Pods status:"
    kubectl get pods -n pakalspot
    
    print_status "Services status:"
    kubectl get services -n pakalspot
    
    print_status "Ingress status:"
    kubectl get ingress -n pakalspot
}

# Function to show logs
show_logs() {
    local component=${1:-backend}
    print_status "Showing logs for: $component"
    kubectl logs -n pakalspot -l app.kubernetes.io/component=$component --tail=100
}

# Main execution
main() {
    print_status "Starting Pakalspot deployment..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Action: $ACTION"
    
    # Pre-flight checks
    check_helm
    check_kubectl
    validate_environment
    validate_action
    
    # Execute action
    case $ACTION in
        install|upgrade|dry-run)
            deploy_chart
            if [ "$ACTION" != "dry-run" ]; then
                show_status
            fi
            ;;
        uninstall)
            uninstall_chart
            ;;
        status)
            show_status
            ;;
    esac
    
    print_success "Deployment script completed successfully!"
}

# Run main function
main "$@"
