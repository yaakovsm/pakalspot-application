// Google Maps API Loader Utility
// This utility handles proper async loading of the Google Maps API

interface GoogleMapsLoaderOptions {
  apiKey: string;
  language?: string;
  region?: string;
  libraries?: string[];
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(options: GoogleMapsLoaderOptions): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

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
        key: options.apiKey,
        ...(options.language && { language: options.language }),
        ...(options.region && { region: options.region }),
        ...(libraries && { libraries }),
        loading: 'async'
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

      // Handle script load
      script.onload = () => {
        // Wait for Google Maps to be fully initialized
        const checkGoogleMaps = () => {
          if (window.google && window.google.maps && window.google.maps.MapTypeId) {
            this.isLoaded = true;
            resolve();
          } else {
            // Wait a bit more for the API to fully initialize
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
