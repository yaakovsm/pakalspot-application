import pytest
from unittest.mock import patch, Mock
from app.services.utils import sunrise_sunset


class TestSunriseSunset:
    """Test cases for the sunrise_sunset utility function."""
    
    @patch('app.services.utils.requests.get')
    def test_sunrise_sunset_success(self, mock_get):
        """Test successful sunrise/sunset API call."""
        # Mock successful API response
        mock_response = Mock()
        mock_response.json.return_value = {
            "results": {
                "sunrise": "2023-01-01T06:30:00+00:00",
                "sunset": "2023-01-01T18:30:00+00:00"
            }
        }
        mock_get.return_value = mock_response
        
        # Test the function
        result = sunrise_sunset(31.5, 34.8)
        
        # Assertions
        assert result["sunrise"] == "2023-01-01T06:30:00+00:00"
        assert result["sunset"] == "2023-01-01T18:30:00+00:00"
        mock_get.assert_called_once_with(
            "https://api.sunrise-sunset.org/json",
            params={"lat": 31.5, "lng": 34.8, "formatted": 0},
            timeout=10
        )
    
    @patch('app.services.utils.requests.get')
    def test_sunrise_sunset_api_error(self, mock_get):
        """Test handling of API errors."""
        # Mock API error response
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("API Error")
        mock_get.return_value = mock_response
        
        # Test that exception is raised
        with pytest.raises(Exception, match="API Error"):
            sunrise_sunset(31.5, 34.8)
    
    @patch('app.services.utils.requests.get')
    def test_sunrise_sunset_missing_data(self, mock_get):
        """Test handling of missing data in API response."""
        # Mock response with missing results
        mock_response = Mock()
        mock_response.json.return_value = {"results": {}}
        mock_get.return_value = mock_response
        
        # Test the function
        result = sunrise_sunset(31.5, 34.8)
        
        # Assertions - should handle missing data gracefully
        assert result["sunrise"] is None
        assert result["sunset"] is None
    
    @patch('app.services.utils.requests.get')
    def test_sunrise_sunset_network_error(self, mock_get):
        """Test handling of network errors."""
        # Mock network error
        mock_get.side_effect = Exception("Network error")
        
        # Test that exception is raised
        with pytest.raises(Exception, match="Network error"):
            sunrise_sunset(31.5, 34.8)
    
    def test_sunrise_sunset_invalid_coordinates(self):
        """Test with invalid coordinates."""
        # Test with invalid latitude
        with pytest.raises(Exception):
            sunrise_sunset(999, 34.8)
        
        # Test with invalid longitude
        with pytest.raises(Exception):
            sunrise_sunset(31.5, 999)
