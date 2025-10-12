// Google Maps API Loader Utility
// This utility handles proper async loading of the Google Maps API

interface GoogleMapsLoaderOptions {
  apiKey?: string;
  language?: string;
  region?: string;
  libraries?: string[];
}

// ✅ Load key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;
  private currentOptions: GoogleMapsLoaderOptions | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(options: GoogleMapsLoaderOptions = {}): Promise<void> {
    // ✅ Inject the key automatically if not provided
    if (!options.apiKey) {
      if (!GOOGLE_MAPS_API_KEY) {
        console.error("Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.");
        return;
      }
      options.apiKey = GOOGLE_MAPS_API_KEY;
    }

    // Check if we need to reload with different language
    if (
      this.isLoaded &&
      this.currentOptions &&
      this.currentOptions.language !== options.language
    ) {
      this.isLoaded = false;
      this.loadPromise = null;
      this.currentOptions = null;

      // Remove existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Clear Google Maps from window
      if (window.google) {
        delete window.google;
      }
    }

    if (this.isLoaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.currentOptions = options;
    this.loadPromise = this.loadScript(options);
    return this.loadPromise;
  }

  private loadScript(options: GoogleMapsLoaderOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded and fully initialized
      if (window.google && window.google.maps && window.google.maps.MapTypeId) {
        this.isLoaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;

      // Build the API URL
      const libraries = options.libraries ? options.libraries.join(',') : '';
      const params = new URLSearchParams({
        key: options.apiKey!,
        ...(options.language && { language: options.language }),
        ...(options.region && { region: options.region }),
        ...(libraries && { libraries }),
        loading: 'async'
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

      // Handle script load
      script.onload = () => {
        const checkGoogleMaps = () => {
          if (window.google && window.google.maps && window.google.maps.MapTypeId) {
            this.isLoaded = true;
            resolve();
          } else {
            setTimeout(checkGoogleMaps, 100);
          }
        };
        checkGoogleMaps();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      // Add script to document
      document.head.appendChild(script);
    });
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!(window.google && window.google.maps);
  }
}

export default GoogleMapsLoader.getInstance();
