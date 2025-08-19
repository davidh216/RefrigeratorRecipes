# RefrigeratorRecipes 🍽️

A comprehensive recipe management application that helps you reduce food waste by tracking ingredients, planning meals, and discovering recipes based on what you have available.

## ✨ Features

### 🥬 Ingredient Management
- **Real-time Inventory Tracking** - Track ingredients with expiration dates
- **Smart Categorization** - Organize by location (fridge, pantry, freezer)
- **Expiration Alerts** - Get notified when ingredients are expiring soon
- **Compact Grid Layout** - Efficient 5-column display with pagination
- **Expiration Tracker** - Visual organization by expiration status with bulk actions
- **Quick Actions** - Floating action button for easy ingredient addition
- **Barcode Scanning** - Quick ingredient addition (coming soon)

### 📖 Recipe Management
- **Complete Recipe Database** - Create, edit, and organize your recipes
- **Ingredient Integration** - Link recipes to your inventory
- **Advanced Filtering** - Search by cuisine, difficulty, time, dietary restrictions
- **Real-time Sync** - All changes sync across devices instantly

### 📅 Meal Planning
- **Weekly Meal Planning** - Plan your meals for the entire week
- **Drag & Drop Interface** - Easy recipe assignment to meal slots
- **Recipe Integration** - Seamlessly connect recipes to meal plans
- **Automatic Planning** - Generate meal plans based on available ingredients

### 🛒 Shopping Lists
- **Smart Generation** - Automatically create shopping lists from meal plans
- **Ingredient Subtraction** - Only shows what you need to buy
- **Category Organization** - Group items by store sections
- **Purchase Tracking** - Mark items as purchased

### 🎯 Recipe Recommendations
- **Ingredient-Based Matching** - Find recipes you can make right now
- **Smart Scoring** - Recommendations based on availability, difficulty, and preferences
- **Missing Ingredient Display** - See exactly what you need to buy
- **Personalized Suggestions** - Learn from your cooking history

### 🔐 Authentication & Security
- **Firebase Authentication** - Secure user accounts
- **Real-time Data Sync** - Changes appear instantly across devices
- **User Privacy** - Your data stays private and secure

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/RefrigeratorRecipes.git
   cd RefrigeratorRecipes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Get your Firebase configuration

4. **Configure environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Set up Firestore security rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{collection}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

### Adding Ingredients
1. Navigate to the Ingredients page
2. Click "Add Ingredient"
3. Fill in the details (name, quantity, expiration date, location)
4. Save to add to your inventory

### Creating Recipes
1. Go to the Recipes page
2. Click "New Recipe"
3. Add recipe details, ingredients, and instructions
4. Save to add to your recipe collection

### Planning Meals
1. Visit the Meal Planning page
2. Drag recipes from your collection to meal slots
3. Adjust servings as needed
4. Your meal plan automatically saves

### Generating Shopping Lists
1. Create a meal plan
2. Go to the Shopping List page
3. Click "Generate from Meal Plan"
4. Review and edit the generated list

### Getting Recipe Recommendations
1. Add ingredients to your inventory
2. Visit the Recommendations page
3. Browse recipes you can make with available ingredients
4. Filter by difficulty, time, or preferences

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.4.6, React 19.1.0, TypeScript 5
- **Styling**: Tailwind CSS 4, CSS Modules
- **Backend**: Firebase 12.1.0 (Authentication, Firestore)
- **State Management**: React Hooks, Context API, TanStack Query
- **Real-time Updates**: Firebase Firestore with onSnapshot
- **Testing**: Jest 30, React Testing Library 16
- **Monitoring**: Sentry 8, Web Vitals, Mixpanel

### Project Structure
```
src/
├── app/                    # Next.js app router pages
├── components/             # Reusable UI components
│   ├── auth/              # Authentication components
│   ├── ingredients/       # Ingredient management
│   ├── recipes/           # Recipe management
│   ├── meal-planning/     # Meal planning
│   ├── shopping-list/     # Shopping lists
│   └── ui/                # Base UI components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   └── firebase/          # Firebase configuration
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```

### Data Models
- **Ingredients**: Track inventory with expiration dates
- **Recipes**: Complete recipe information with ingredients and instructions
- **Meal Plans**: Weekly meal scheduling
- **Shopping Lists**: Generated from meal plans and inventory

## 🔧 Development

### Available Scripts
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run build:staging          # Build for staging
npm run build:production       # Build for production
npm run start                  # Start production server
npm run start:staging          # Start staging server
npm run start:production       # Start production server
npm run lint                   # Run ESLint
npm run lint:fix               # Fix ESLint issues
npm run type-check             # Run TypeScript type checking
npm run test                   # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Run tests with coverage
npm run test:ci                # Run tests for CI
npm run analyze                # Analyze bundle size
npm run security-audit         # Run security audit
```

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits for version control

## 📊 Current Status

### ✅ Completed Features (95%)
- **Authentication System**: Complete Firebase Auth with email/password and Google OAuth
- **Ingredient Management**: Full CRUD operations with real-time updates, expiration tracking, and pagination
- **Recipe Management**: Complete Firebase integration with search, filtering, recommendations, and pagination
- **Meal Planning**: Real-time meal planning with drag-and-drop interface
- **Shopping Lists**: Intelligent generation from meal plans with ingredient subtraction
- **Recipe Recommendations**: AI-like suggestions based on available ingredients
- **UI/UX**: Responsive design with dark mode and comprehensive component library
- **Testing Framework**: Comprehensive Jest and React Testing Library setup with 267 tests
- **Performance Optimization**: Pagination, caching, service worker, and bundle optimization
- **Production Deployment**: Complete monitoring, security, and backup systems
- **Offline Support**: Service worker with full offline functionality

### 🚧 In Progress (3%)
- **Test Coverage**: Currently at 20.47% coverage, targeting 80%
- **Advanced Features**: Social features and mobile app planning

### 📋 Planned Features (2%)
- **Social Features**: Recipe sharing, ratings, and user profiles
- **Mobile App**: React Native development with offline capabilities
- **Advanced Analytics**: Usage tracking and food waste reduction insights

## 📚 Documentation

### Core Documentation
- [Firebase Setup & Integration](./docs/FIREBASE.md) - Complete Firebase setup and integration guide
- [Implementation Status](./docs/IMPLEMENTATION.md) - Current feature status and roadmap
- [Testing Guide](./docs/TESTING.md) - Testing framework and coverage information
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment and monitoring

### Technical Documentation
- [API Reference](./docs/API.md) - Firebase functions and hooks documentation
- [Component Library](./docs/COMPONENTS.md) - UI component documentation
- [Performance Optimization](./docs/PERFORMANCE.md) - Performance optimizations and metrics
- [Security Implementation](./docs/SECURITY.md) - Security features and audit results

### Documentation Index
- [Documentation Index](./docs/INDEX.md) - Complete guide to all documentation

## 🧪 Testing

```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:ci           # Run tests for CI environment
```

**Current Coverage**: 20.47% (Target: 80%)

## 📦 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Other Platforms
- Netlify
- Firebase Hosting
- AWS Amplify

## 🐛 Troubleshooting

### Common Issues
1. **Firebase Connection Errors**
   - Verify environment variables
   - Check Firebase project configuration
   - Ensure Firestore rules are correct

2. **Authentication Issues**
   - Clear browser cache
   - Check Firebase Auth settings
   - Verify email/password authentication is enabled

3. **Real-time Update Problems**
   - Check network connectivity
   - Verify Firestore security rules
   - Ensure proper subscription cleanup

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase team for the excellent backend services
- Next.js team for the amazing React framework
- Tailwind CSS for the utility-first styling
- All contributors who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/RefrigeratorRecipes/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/RefrigeratorRecipes/discussions)
- **Email**: support@refrigeratorrecipes.com

---

**Made with ❤️ to help reduce food waste and make cooking easier!**
