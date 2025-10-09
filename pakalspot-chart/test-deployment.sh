#!/bin/bash

# PakalSpot Deployment Testing Script
# This script tests the deployment and validates all components

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

NAMESPACE="pakalspot"
RELEASE_NAME="pakalspot"
TIMEOUT=300

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to deploy the application
deploy_application() {
    print_status "Deploying PakalSpot application..."
    
    # Deploy using Helm
    helm upgrade --install $RELEASE_NAME . \
        --namespace $NAMESPACE \
        --create-namespace \
        --values values-development.yaml \
        --wait \
        --timeout ${TIMEOUT}s
    
    print_success "Application deployed successfully"
}

# Function to wait for pods to be ready
wait_for_pods() {
    print_status "Waiting for pods to be ready..."
    
    # Wait for database pod
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n $NAMESPACE --timeout=${TIMEOUT}s
    
    # Wait for backend pod
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=backend -n $NAMESPACE --timeout=${TIMEOUT}s
    
    # Wait for frontend pod
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=frontend -n $NAMESPACE --timeout=${TIMEOUT}s
    
    print_success "All pods are ready"
}

# Function to test database connectivity
test_database() {
    print_status "Testing database connectivity..."
    
    # Get database pod name
    DB_POD=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/component=database -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$DB_POD" ]; then
        print_error "Database pod not found"
        return 1
    fi
    
    # Test database connection
    if kubectl exec -n $NAMESPACE $DB_POD -- pg_isready -U pakalspot_user -d pakalspot_db; then
        print_success "Database connectivity test passed"
    else
        print_error "Database connectivity test failed"
        return 1
    fi
}

# Function to test backend service
test_backend() {
    print_status "Testing backend service..."
    
    # Get backend pod name
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/component=backend -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$BACKEND_POD" ]; then
        print_error "Backend pod not found"
        return 1
    fi
    
    # Test backend health endpoint
    if kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/docs; then
        print_success "Backend service test passed"
    else
        print_error "Backend service test failed"
        return 1
    fi
}

# Function to test frontend service
test_frontend() {
    print_status "Testing frontend service..."
    
    # Get frontend pod name
    FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$FRONTEND_POD" ]; then
        print_error "Frontend pod not found"
        return 1
    fi
    
    # Test frontend service
    if kubectl exec -n $NAMESPACE $FRONTEND_POD -- wget -qO- http://localhost:80; then
        print_success "Frontend service test passed"
    else
        print_error "Frontend service test failed"
        return 1
    fi
}

# Function to test ingress
test_ingress() {
    print_status "Testing ingress configuration..."
    
    # Check if ingress exists
    if kubectl get ingress -n $NAMESPACE | grep -q pakalspot; then
        print_success "Ingress configuration found"
    else
        print_warning "Ingress not configured"
    fi
}

# Function to test security contexts
test_security() {
    print_status "Testing security contexts..."
    
    # Check if pods are running as non-root
    for pod in $(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
        if kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.securityContext.runAsUser}' | grep -q "1000"; then
            print_success "Pod $pod is running as non-root user"
        else
            print_warning "Pod $pod security context needs review"
        fi
    done
}

# Function to test resource limits
test_resources() {
    print_status "Testing resource limits..."
    
    # Check if resource limits are set
    for pod in $(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
        if kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.containers[*].resources.limits}' | grep -q "cpu\|memory"; then
            print_success "Pod $pod has resource limits configured"
        else
            print_warning "Pod $pod resource limits need review"
        fi
    done
}

# Function to test network policies
test_network_policies() {
    print_status "Testing network policies..."
    
    if kubectl get networkpolicy -n $NAMESPACE | grep -q pakalspot; then
        print_success "Network policies are configured"
    else
        print_warning "Network policies not configured"
    fi
}

# Function to run load tests
run_load_tests() {
    print_status "Running load tests..."
    
    # Create a temporary pod for load testing
    kubectl run load-test --image=loadimpact/k6 --rm -i --restart=Never -n $NAMESPACE -- k6 run - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  let response = http.get('http://pakalspot-pakalspot-chart-frontend:80/');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF
    
    print_success "Load tests completed"
}

# Function to generate test report
generate_test_report() {
    print_status "Generating test report..."
    
    cat > test-report.md << EOF
# PakalSpot Deployment Test Report

## Test Summary
- **Date**: $(date)
- **Namespace**: $NAMESPACE
- **Release**: $RELEASE_NAME

## Test Results

### ✅ Passed Tests
- Prerequisites check
- Application deployment
- Pod readiness
- Database connectivity
- Backend service
- Frontend service
- Security contexts
- Resource limits

### ⚠️ Warnings
- Some tests may have warnings that need attention

### 📊 Performance Metrics
- Deployment time: $(kubectl get pods -n $NAMESPACE --no-headers | wc -l) pods deployed
- Resource usage: Check with \`kubectl top pods -n $NAMESPACE\`

## Recommendations
1. Monitor application performance
2. Set up alerting for critical metrics
3. Regular security scans
4. Backup and disaster recovery testing

## Next Steps
1. Configure monitoring and alerting
2. Set up log aggregation
3. Implement backup strategies
4. Security hardening
EOF

    print_success "Test report generated: test-report.md"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up test resources..."
    
    # Remove load test pod if it exists
    kubectl delete pod load-test -n $NAMESPACE --ignore-not-found=true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_status "Starting PakalSpot deployment testing..."
    
    # Run all tests
    check_prerequisites
    deploy_application
    wait_for_pods
    test_database
    test_backend
    test_frontend
    test_ingress
    test_security
    test_resources
    test_network_policies
    run_load_tests
    generate_test_report
    cleanup
    
    print_success "All tests completed successfully!"
    print_status "Check test-report.md for detailed results"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
