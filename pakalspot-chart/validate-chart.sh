#!/bin/bash

# Pakalspot Helm Chart Validation Script
# This script validates the chart structure and configuration

set -e

CHART_PATH="./"
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate chart structure
validate_chart_structure() {
    print_status "Validating chart structure..."
    
    # Check required files
    local required_files=(
        "Chart.yaml"
        "values.yaml"
        "values-development.yaml"
        "values-staging.yaml"
        "values-production.yaml"
        "templates/_helpers.tpl"
        "templates/namespace.yaml"
        "templates/backend-deployment.yaml"
        "templates/backend-service.yaml"
        "templates/backend-secrets.yaml"
        "templates/frontend-deployment.yaml"
        "templates/frontend-service.yaml"
        "templates/database-statefulset.yaml"
        "templates/database-service.yaml"
        "templates/database-secrets.yaml"
        "templates/ingress.yaml"
        "templates/NOTES.txt"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "✓ $file exists"
        else
            print_error "✗ $file is missing"
            exit 1
        fi
    done
}

# Function to validate Helm chart
validate_helm_chart() {
    print_status "Validating Helm chart syntax..."
    
    if helm lint $CHART_PATH; then
        print_success "✓ Helm chart linting passed"
    else
        print_error "✗ Helm chart linting failed"
        exit 1
    fi
}

# Function to validate template rendering
validate_template_rendering() {
    print_status "Validating template rendering..."
    
    local environments=("development" "staging" "production")
    
    for env in "${environments[@]}"; do
        print_status "Testing $env environment..."
        
        if helm template pakalspot $CHART_PATH --values values-$env.yaml > /dev/null 2>&1; then
            print_success "✓ $env environment templates render successfully"
        else
            print_error "✗ $env environment templates failed to render"
            exit 1
        fi
    done
}

# Function to validate values files
validate_values_files() {
    print_status "Validating values files..."
    
    # Check if values files are valid YAML
    local values_files=("values.yaml" "values-development.yaml" "values-staging.yaml" "values-production.yaml")
    
    for file in "${values_files[@]}"; do
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            print_success "✓ $file is valid YAML"
        else
            print_error "✗ $file contains invalid YAML"
            exit 1
        fi
    done
}

# Function to check for common issues
check_common_issues() {
    print_status "Checking for common issues..."
    
    # Check for hardcoded values
    if grep -r "yaakovsm" templates/ | grep -v "repository:" > /dev/null; then
        print_warning "⚠ Found hardcoded references to 'yaakovsm' in templates"
    fi
    
    # Check for missing resource limits
    if ! grep -q "resources:" templates/backend-deployment.yaml; then
        print_warning "⚠ Backend deployment missing resource limits"
    fi
    
    if ! grep -q "resources:" templates/frontend-deployment.yaml; then
        print_warning "⚠ Frontend deployment missing resource limits"
    fi
    
    if ! grep -q "resources:" templates/database-statefulset.yaml; then
        print_warning "⚠ Database StatefulSet missing resource limits"
    fi
    
    # Check for security contexts
    if ! grep -q "securityContext:" templates/backend-deployment.yaml; then
        print_warning "⚠ Backend deployment missing security context"
    fi
    
    print_success "✓ Common issues check completed"
}

# Function to generate deployment summary
generate_summary() {
    print_status "Generating deployment summary..."
    
    echo ""
    echo "=========================================="
    echo "PAKALSPOT HELM CHART VALIDATION SUMMARY"
    echo "=========================================="
    echo ""
    echo "Chart Information:"
    echo "- Chart Name: $(grep '^name:' Chart.yaml | awk '{print $2}')"
    echo "- Chart Version: $(grep '^version:' Chart.yaml | awk '{print $2}')"
    echo "- App Version: $(grep '^appVersion:' Chart.yaml | awk '{print $2}')"
    echo ""
    echo "Services:"
    echo "- Frontend: $(grep 'repository:' values.yaml | head -1 | awk '{print $2}')"
    echo "- Backend: $(grep 'repository:' values.yaml | tail -1 | awk '{print $2}')"
    echo "- Database: PostgreSQL with PostGIS"
    echo ""
    echo "Environments:"
    echo "- Development: $(grep 'environment:' values-development.yaml | awk '{print $2}')"
    echo "- Staging: $(grep 'environment:' values-staging.yaml | awk '{print $2}')"
    echo "- Production: $(grep 'environment:' values-production.yaml | awk '{print $2}')"
    echo ""
    echo "Deployment Commands:"
    echo "- Development: ./deploy.sh development install"
    echo "- Staging: ./deploy.sh staging install"
    echo "- Production: ./deploy.sh production install"
    echo ""
    echo "Troubleshooting:"
    echo "- If namespace conflicts occur: ./cleanup-namespace.sh"
    echo "- Check status: ./deploy.sh development status"
    echo "- View logs: kubectl logs -n pakalspot -l app.kubernetes.io/component=backend"
    echo ""
    echo "=========================================="
}

# Main execution
main() {
    print_status "Starting Pakalspot Helm Chart validation..."
    
    validate_chart_structure
    validate_helm_chart
    validate_template_rendering
    validate_values_files
    check_common_issues
    generate_summary
    
    print_success "Chart validation completed successfully!"
    print_status "Your Helm chart is ready for deployment!"
}

# Run main function
main "$@"
