import json
import re
import requests as http_requests


def fetch_street_geometry(street_name, lat, lng):
    """Fetch street geometry from Overpass API. Returns JSON string or None."""
    try:
        # Strip trailing house number (e.g., "Kneza Milosa 5" -> "Kneza Milosa")
        road_name = re.sub(r'\s+\d+[a-zA-Z]?\s*$', '', street_name.strip())

        # Bounding box ~6km around the point
        delta_lat = 0.03
        delta_lng = 0.04
        bbox = f"{lat - delta_lat},{lng - delta_lng},{lat + delta_lat},{lng + delta_lng}"

        query = f'[out:json][timeout:10];way["name"="{road_name}"]({bbox});out geom;'
        response = http_requests.get(
            'https://overpass-api.de/api/interpreter',
            params={'data': query},
            timeout=15
        )
        response.raise_for_status()
        data = response.json()

        if not data.get('elements'):
            return None

        segments = []
        for element in data['elements']:
            if 'geometry' in element:
                coords = [[point['lat'], point['lon']] for point in element['geometry']]
                if len(coords) >= 2:
                    segments.append(coords)

        return json.dumps(segments) if segments else None

    except Exception as e:
        print(f"Error fetching geometry for '{street_name}': {e}")
        return None
