"""Utility functions for parsing enums with case-insensitive matching."""
from app.models import Region, SpotType


def parse_region(region_str: str) -> Region:
    """Parse region string into Region enum (case-insensitive)."""
    if not region_str:
        return Region.golan
    
    region_str = region_str.strip()
    
    # Try exact match by value first (e.g., "Sharon")
    for region in Region:
        if region.value == region_str:
            return region
    
    # Try exact match by name (e.g., "sharon")
    try:
        return Region[region_str]
    except KeyError:
        pass
    
    # Try case-insensitive match by value (e.g., "sharon" matches "Sharon")
    region_lower = region_str.lower()
    for region in Region:
        if region.value.lower() == region_lower:
            return region
    
    # Try case-insensitive match by name (e.g., "SHARON" matches "sharon")
    for region in Region:
        if region.name.lower() == region_lower:
            return region
    
    # Try with hyphen/underscore conversion (e.g., "galilee-elion" -> "galilee_elion")
    normalized = region_lower.replace('-', '_')
    try:
        return Region[normalized]
    except KeyError:
        pass
    
    # Default fallback
    print(f"Warning: Unknown region '{region_str}', defaulting to golan")
    print(f"Available regions: {[r.name for r in Region]}")
    return Region.golan


def parse_spot_type(spot_type_str: str) -> SpotType:
    """
    Parse spot type string into SpotType enum (case-insensitive).
    For multiple types (viewpoint|forest), uses the first valid one.
    """
    if not spot_type_str:
        return SpotType.viewpoint
    
    spot_type_str = spot_type_str.strip()
    
    # Handle multiple types separated by |
    if '|' in spot_type_str:
        types = [t.strip() for t in spot_type_str.split('|')]
        for t in types:
            try:
                # Try exact match
                return SpotType[t]
            except KeyError:
                try:
                    # Try case-insensitive
                    for st in SpotType:
                        if st.name.lower() == t.lower():
                            return st
                except:
                    continue
        # If none worked, default
        return SpotType.viewpoint
    
    # Single type - try exact match
    try:
        return SpotType[spot_type_str]
    except KeyError:
        pass
    
    # Try case-insensitive match
    spot_type_lower = spot_type_str.lower()
    for st in SpotType:
        if st.name.lower() == spot_type_lower or st.value.lower() == spot_type_lower:
            return st
    
    # Default fallback
    print(f"Warning: Unknown spot type '{spot_type_str}', defaulting to viewpoint")
    return SpotType.viewpoint