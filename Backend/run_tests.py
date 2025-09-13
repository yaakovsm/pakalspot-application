#!/usr/bin/env python3
"""
Test runner script for PakalSpot backend tests.
This script provides an easy way to run different types of tests.
"""

import subprocess
import sys
import os


def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n{'='*50}")
    print(f"Running: {description}")
    print(f"Command: {command}")
    print(f"{'='*50}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running {description}:")
        print(f"Return code: {e.returncode}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False


def main():
    """Main test runner function."""
    if len(sys.argv) < 2:
        print("Usage: python run_tests.py [unit|integration|all|coverage]")
        print("\nOptions:")
        print("  unit        - Run unit tests only")
        print("  integration - Run integration tests only")
        print("  all         - Run all tests")
        print("  coverage    - Run all tests with coverage report")
        sys.exit(1)
    
    test_type = sys.argv[1].lower()
    
    # Change to the backend directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    if test_type == "unit":
        success = run_command("pytest tests/unit/ -m unit", "Unit Tests")
    elif test_type == "integration":
        success = run_command("pytest tests/integration/ -m integration", "Integration Tests")
    elif test_type == "all":
        success = run_command("pytest tests/", "All Tests")
    elif test_type == "coverage":
        success = run_command("pytest tests/ --cov=app --cov-report=html --cov-report=term", "Tests with Coverage")
    else:
        print(f"Unknown test type: {test_type}")
        sys.exit(1)
    
    if success:
        print(f"\n✅ {test_type.title()} tests completed successfully!")
    else:
        print(f"\n❌ {test_type.title()} tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
