import requests


def sunrise_sunset(lat: float, lng: float):
	# Using sunrise-sunset.org free API
	resp = requests.get(
		"https://api.sunrise-sunset.org/json",
		params={"lat": lat, "lng": lng, "formatted": 0},
		timeout=10,
	)
	resp.raise_for_status()
	data = resp.json().get("results", {})
	return {
		"sunrise": data.get("sunrise"),
		"sunset": data.get("sunset"),
	}


