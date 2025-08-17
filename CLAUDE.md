# Claude Code Session Notes

## Project Context
RefrigeratorRecipes - A React/TypeScript application for managing ingredients, recipes, meal planning, and shopping lists using Firebase backend.

## Critical Commands
- **Lint**: `npm run lint` - Check code style (has warnings but builds successfully)
- **Build**: `npm run build` - ✅ Production build works correctly
- **Dev Server**: `npm run dev` - Start development server
- **Test**: `npm test` - Run Jest test suite

## Recent Session Summary

### Bugs Fixed
1. **Meal Planning Tab Crash** - Added missing `getWeeklySummary` function to `useMealPlan` hook
2. **Recommendations Tab Error** - Fixed null checking in `Tabs` component 
3. **Shopping List Broken** - Implemented complete state management in `useShoppingList`
4. **UI/UX Issues** - Fixed cursor indicators and modal sizing

### Features Implemented
1. **User-Editable Pricing** - Shopping list items now support custom user prices
2. **Item Management** - Full CRUD operations for shopping list items
3. **Performance Optimizations** - Added React.memo, useMemo, useCallback, and debounced search

### Architecture Notes
- All hooks use real-time Firebase subscriptions
- Demo mode supported for offline development
- Custom debounce hook created for search optimization
- Comprehensive error handling with user feedback

### Key Files Modified
- `src/hooks/useMealPlan.ts` - Added getWeeklySummary function
- `src/components/ui/Tabs.tsx` - Added null safety
- `src/hooks/useShoppingList.ts` - Complete implementation
- `src/types/index.ts` - Updated ShoppingListItem interface
- `src/hooks/useDebounce.ts` - New performance hook

### Performance Optimizations Applied
- React.memo on expensive components (RecipeCard, IngredientCard, etc.)
- useMemo for expensive calculations
- useCallback for stable function references  
- Debounced search inputs for better UX

### Current State
All critical bugs resolved. Application is stable and performant. Ready for production deployment or developer handoff.

## Development Guidelines
- Always run lint and typecheck before commits
- Use the custom hooks for data management
- Follow the established component patterns
- Maintain TypeScript strict typing
- Test in both demo mode and Firebase mode

## Firebase Collections Structure
- `users/{userId}/ingredients` - User ingredients with expiration tracking
- `users/{userId}/recipes` - User recipes with metadata
- `users/{userId}/shoppingLists` - Shopping lists with user pricing
- `users/{userId}/mealPlans` - Weekly meal planning data

## Next Developer Notes
1. Consider adding comprehensive test suite
2. Implement offline support for better UX
3. Add recipe sharing functionality
4. Consider barcode scanning for ingredients
5. Monitor performance with larger datasets