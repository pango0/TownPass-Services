import axios from 'axios';

// Define types for the API response
interface GeocodingResponse {
    results: {
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        formatted_address: string; // Optional, for debugging or additional information
    }[];
}

// Function to get coordinates from a place name
export const getCoordinatesByPlaceName = async (placeName: string): Promise<{ lat: number; lng: number } | null> => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY; // Replace with your API key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName)}&key=${apiKey}`;

    try {
        const response = await axios.get<GeocodingResponse>(url);
        const results = response.data.results;
        console.log(results)
        if (results.length > 0) {
            const location = results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng,
            };
        } else {
            console.error('No results found for the place name.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        return null;
    }
};
