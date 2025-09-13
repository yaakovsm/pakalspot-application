# Testing Guide

This guide explains how to run and maintain tests for the PakalSpot application.

## Test Structure

The testing framework is organized as follows:

```
PakalSpot/Backend/
├── tests/
│   ├── __init__.py
│   ├── unit/                    # Unit tests
│   │   ├── __init__.py
│   │   ├── test_utils.py        # Tests for utility functions
│   │   └── test_security.py     # Tests for security functions
│   └── integration/             # Integration tests
│       ├── __init__.py
│       ├── test_auth_endpoints.py    # Tests for auth API endpoints
│       └── test_spots_endpoints.py   # Tests for spots API endpoints
├── pytest.ini                  # Pytest configuration
├── run_tests.py                # Test runner script
└── requirements.txt            # Includes testing dependencies
```

## Test Types

### Unit Tests

Unit tests focus on testing individual functions and methods in isolation. They use mocks to isolate the code under test from external dependencies.

**Current Unit Tests:**
- `test_utils.py` - Tests for the `sunrise_sunset` utility function
- `test_security.py` - Tests for password hashing, JWT tokens, and authentication

**Key Features:**
- Mock external API calls
- Test error handling
- Validate input/output behavior
- Fast execution

### Integration Tests

Integration tests verify that different parts of the application work together correctly. They test the full request/response cycle through the API.

**Current Integration Tests:**
- `test_auth_endpoints.py` - Tests for user registration and login
- `test_spots_endpoints.py` - Tests for spot creation, listing, and retrieval

**Key Features:**
- Use test database (SQLite)
- Test complete API workflows
- Verify database interactions
- Test authentication flows

## Running Tests

### Prerequisites

1. Install testing dependencies:
   ```bash
   cd PakalSpot/Backend
   pip install -r requirements.txt
   ```

2. Ensure you have a test database (SQLite is used by default)

### Running Tests

#### Using the Test Runner Script

The easiest way to run tests is using the provided test runner:

```bash
# Run unit tests only
python run_tests.py unit

# Run integration tests only
python run_tests.py integration

# Run all tests
python run_tests.py all

# Run all tests with coverage report
python run_tests.py coverage
```

#### Using Pytest Directly

You can also run tests directly with pytest:

```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit/

# Run integration tests only
pytest tests/integration/

# Run specific test file
pytest tests/unit/test_utils.py

# Run specific test function
pytest tests/unit/test_utils.py::TestSunriseSunset::test_sunrise_sunset_success

# Run tests with verbose output
pytest -v

# Run tests with coverage
pytest --cov=app --cov-report=html
```

## Test Configuration

### Pytest Configuration (`pytest.ini`)

The pytest configuration includes:
- Test discovery patterns
- Output formatting
- Custom markers for test categorization
- Warning suppression

### Test Markers

Tests are categorized using pytest markers:
- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow running tests

## Writing Tests

### Unit Test Example

```python
import pytest
from unittest.mock import patch, Mock
from app.services.utils import sunrise_sunset

class TestSunriseSunset:
    @patch('app.services.utils.requests.get')
    def test_sunrise_sunset_success(self, mock_get):
        # Arrange
        mock_response = Mock()
        mock_response.json.return_value = {
            "results": {
                "sunrise": "2023-01-01T06:30:00+00:00",
                "sunset": "2023-01-01T18:30:00+00:00"
            }
        }
        mock_get.return_value = mock_response
        
        # Act
        result = sunrise_sunset(31.5, 34.8)
        
        # Assert
        assert result["sunrise"] == "2023-01-01T06:30:00+00:00"
        assert result["sunset"] == "2023-01-01T18:30:00+00:00"
```

### Integration Test Example

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_success():
    user_data = {
        "email": "test@example.com",
        "password": "test_password_123",
        "display_name": "Test User"
    }
    
    response = client.post("/auth/register", json=user_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
```

## Test Best Practices

### 1. Test Structure (AAA Pattern)
- **Arrange** - Set up test data and mocks
- **Act** - Execute the code under test
- **Assert** - Verify the results

### 2. Test Naming
- Use descriptive test names that explain what is being tested
- Include the expected behavior in the name
- Use `test_` prefix for test functions

### 3. Test Isolation
- Each test should be independent
- Use `setup_method` and `teardown_method` for test data
- Mock external dependencies

### 4. Assertions
- Use specific assertions
- Test both positive and negative cases
- Verify error conditions

### 5. Test Data
- Use realistic test data
- Test edge cases and boundary conditions
- Use factories for complex test data

## Coverage

### Running Coverage Reports

```bash
# Generate HTML coverage report
pytest --cov=app --cov-report=html

# Generate terminal coverage report
pytest --cov=app --cov-report=term

# Generate both HTML and terminal reports
pytest --cov=app --cov-report=html --cov-report=term
```

### Coverage Goals

- **Unit Tests**: Aim for 90%+ coverage of utility functions
- **Integration Tests**: Aim for 80%+ coverage of API endpoints
- **Overall**: Aim for 85%+ overall coverage

## Continuous Integration

### GitHub Actions (Recommended)

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.11
    
    - name: Install dependencies
      run: |
        cd PakalSpot/Backend
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd PakalSpot/Backend
        pytest --cov=app --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
      with:
        file: ./PakalSpot/Backend/coverage.xml
```

## Debugging Tests

### Common Issues

1. **Database Issues**
   - Ensure test database is properly configured
   - Check that tables are created before tests run
   - Verify database cleanup between tests

2. **Import Issues**
   - Check that all required modules are installed
   - Verify Python path is correct
   - Ensure `__init__.py` files are present

3. **Mock Issues**
   - Verify mock paths are correct
   - Check that mocks are properly configured
   - Ensure mocks are reset between tests

### Debugging Tips

1. **Use `pytest -s`** to see print statements
2. **Use `pytest --pdb`** to drop into debugger on failures
3. **Use `pytest -x`** to stop on first failure
4. **Use `pytest --lf`** to run only the last failed test

## Adding New Tests

### For New Features

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API endpoints and workflows
3. **Update Coverage**: Ensure new code is covered by tests

### For Bug Fixes

1. **Reproduction Test**: Write a test that reproduces the bug
2. **Fix Implementation**: Implement the fix
3. **Verify Fix**: Ensure the test passes
4. **Regression Test**: Ensure existing tests still pass

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep testing dependencies up to date
2. **Review Coverage**: Regularly check test coverage
3. **Refactor Tests**: Keep tests clean and maintainable
4. **Remove Obsolete Tests**: Remove tests for removed features

### Test Review Checklist

- [ ] Tests are readable and well-documented
- [ ] Tests cover both success and failure cases
- [ ] Tests are independent and can run in any order
- [ ] Tests use appropriate mocks and stubs
- [ ] Tests verify the correct behavior
- [ ] Tests are fast and don't have unnecessary delays
- [ ] Tests don't depend on external services
- [ ] Tests clean up after themselves
