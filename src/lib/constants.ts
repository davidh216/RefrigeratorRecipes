// Application constants

export const RECIPE_CATEGORIES = [
  'Breakfast',
  'Lunch', 
  'Dinner',
  'Snack',
  'Dessert',
  'Appetizer',
  'Beverage'
] as const;

export const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Keto',
  'Low-Carb',
  'High-Protein'
] as const;

export const INGREDIENT_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'grains',
  'canned',
  'frozen',
  'spices',
  'condiments',
  'beverages',
  'snacks',
  'baking',
  'other'
] as const;

export const INGREDIENT_UNITS = [
  'pieces',
  'cups',
  'tbsp',
  'tsp',
  'lbs',
  'oz',
  'g',
  'kg',
  'ml',
  'l',
  'fl oz',
  'qt',
  'pt',
  'gal'
] as const;

export const INGREDIENT_LOCATIONS = [
  'fridge',
  'pantry',
  'freezer'
] as const;

export const COMMON_INGREDIENT_TAGS = [
  'organic',
  'gluten-free',
  'vegetarian',
  'vegan',
  'low-sodium',
  'sugar-free',
  'keto',
  'paleo',
  'whole-grain',
  'fresh',
  'frozen',
  'canned',
  'dried',
  'raw',
  'cooked',
  'leftover'
] as const;