# PakalSpot Frontend - Israel Nature Explorer

A modern React application for discovering and sharing amazing natural spots across Israel. Built with React, TypeScript, MapLibre GL, and TailwindCSS.

## 🇮🇱 Israel-Focused Features

- **Israel Map Bounds**: Map restricted to Israel territory (34.25°-35.9°E, 29.5°-33.4°N)
- **Default Center**: Tel Aviv area (31.5°N, 34.8°E) with zoom level 7
- **Israeli Regions**: Filter by Negev, Galilee, Golan Heights, Shfela, Sharon, Shomron, Jerusalem, Arava
- **Israel-Specific Spot Types**: Waterfalls, springs, viewpoints, archaeological sites, religious sites
- **Distance Filters**: 5km, 10km, 20km radius from current location
- **Location Validation**: Only allows spots within Israel boundaries

## 🚀 Core Features

- **Interactive Maps**: Explore spots with MapLibre GL integration and Israel focus
- **Spot Discovery**: Browse, search, and filter spots by type, distance, and region
- **User Authentication**: JWT-based login and registration
- **Favorites System**: Save and manage your favorite Israeli spots
- **Like/Dislike**: Rate spots and see community feedback
- **Add Spots**: Create new spots with photos and detailed information (Israel locations only)
- **Responsive Design**: Beautiful mobile-first design optimized for Hebrew/English users
- **Real-time Updates**: Dynamic spot data with clustering and popups

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Maps**: MapLibre GL JS
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **HTTP Client**: Axios with JWT interceptors
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pakalspot-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the environment variables for Israel configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
   # Default Israel bounds: 34.25-35.9°E, 29.5-33.4°N
   # Default center: 31.5°N, 34.8°E (Tel Aviv area)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## 🐳 Docker Development

### Development with Docker Compose

```bash
# Start development environment
docker-compose up frontend-dev

# Or build and run manually
docker build -f Dockerfile.dev -t pakalspot-frontend:dev .
docker run -p 5173:5173 -v $(pwd):/app pakalspot-frontend:dev
```

### Production Build

```bash
# Build production image
docker build -t pakalspot-frontend:prod .

# Run production container
docker run -p 3000:80 pakalspot-frontend:prod

# Or use docker-compose
docker-compose up frontend
```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── MapView.tsx     # Interactive map component
│   ├── Sidebar.tsx     # Spot list and filters
│   ├── SpotCard.tsx    # Individual spot display
│   ├── Header.tsx      # Navigation header
│   └── AddSpotForm.tsx # Spot creation form
├── pages/              # Route components
│   ├── Home.tsx        # Main app page
│   ├── Login.tsx       # Authentication
│   ├── Register.tsx    # User registration
│   └── Favorites.tsx   # User's saved spots
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication state
│   └── useSpots.ts     # Spots data management
├── api/                # API client and endpoints
│   └── api.ts          # Axios instance with JWT
├── types/              # TypeScript definitions
│   └── spot.ts         # Data models
└── lib/                # Utilities
    └── utils.ts        # Helper functions
```

## 🎨 Design System

The app uses a beautiful nature-inspired design system optimized for Israeli landscapes:

- **Primary**: Forest Green (#2d7c3e) - representing Israel's forests
- **Secondary**: Mediterranean Blue - reflecting Israel's coastline  
- **Accent**: Desert Orange - inspired by the Negev landscape
- **Israeli Regions**: Distinct colors for each region (Negev, Galilee, etc.)
- **Semantic Tokens**: All colors defined in CSS variables
- **Responsive**: Mobile-first with RTL support potential for Hebrew
- **Animations**: Smooth transitions optimized for map interactions

## 🗺️ Israel-Specific Configuration

### Map Bounds and Center
- **Default Center**: Tel Aviv area (31.5°N, 34.8°E)
- **Default Zoom**: Level 7 (shows most of Israel)
- **Bounds**: Southwest (34.25°E, 29.5°N) to Northeast (35.9°E, 33.4°N)
- **Validation**: Prevents adding spots outside Israel territory

### Israeli Regions
- **Negev**: Southern desert region
- **Galilee**: Northern region with Sea of Galilee
- **Golan Heights**: Northeastern plateau
- **Shfela**: Lowlands region
- **Sharon**: Coastal plain
- **Shomron**: Central hills (Samaria)
- **Jerusalem**: Capital region
- **Arava**: Rift valley region

## 🔌 API Integration

The frontend expects a REST API with these endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile

### Spots
- `GET /spots` - List spots with filters
- `GET /spots/:id` - Get spot details
- `POST /spots` - Create new spot
- `PATCH /spots/:id` - Update spot
- `DELETE /spots/:id` - Delete spot
- `POST /spots/:id/like` - Like/dislike spot
- `POST /spots/:id/favorite` - Add to favorites
- `DELETE /spots/:id/favorite` - Remove from favorites
- `GET /spots/favorites` - Get user's favorites

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
| `VITE_MAP_TILE_URL` | Map tile server URL | OpenStreetMap tiles |
| `VITE_MAPBOX_TOKEN` | Mapbox token (optional) | - |

## 🚢 Deployment

### Docker Production

```bash
# Build production image
docker build -t pakalspot-frontend .

# Tag for registry
docker tag pakalspot-frontend your-registry/pakalspot-frontend:latest

# Push to registry
docker push your-registry/pakalspot-frontend:latest
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **Components**: Add to `src/components/`
2. **Pages**: Add to `src/pages/` and update routes in `App.tsx`
3. **API Endpoints**: Extend `src/api/api.ts`
4. **Types**: Define in `src/types/`
5. **State**: Use Zustand stores in `src/hooks/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.