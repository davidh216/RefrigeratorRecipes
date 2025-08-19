import { Ingredient } from '@/types';

// Ingredient template interface
export interface IngredientTemplate {
  name: string;
  category: string;
  unit: string;
  location: 'fridge' | 'freezer' | 'pantry';
  shelfLife: number; // days
  tags: string[];
  notes?: string;
  quantityRange: [number, number]; // min, max quantity for randomization
}

// Template data for different ingredient categories
export const ingredientTemplates: IngredientTemplate[] = [
  // Proteins
  {
    name: 'Chicken Breast',
    category: 'protein',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 5,
    tags: ['organic', 'boneless'],
    notes: 'Free range chicken',
    quantityRange: [1, 3]
  },
  {
    name: 'Ground Beef',
    category: 'protein',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 3,
    tags: ['lean', '85/15'],
    quantityRange: [1, 2]
  },
  {
    name: 'Salmon Fillet',
    category: 'protein',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 2,
    tags: ['wild-caught', 'fresh'],
    quantityRange: [0.5, 2]
  },
  {
    name: 'Eggs',
    category: 'protein',
    unit: 'dozen',
    location: 'fridge',
    shelfLife: 21,
    tags: ['large', 'cage-free'],
    quantityRange: [1, 2]
  },
  {
    name: 'Tofu',
    category: 'protein',
    unit: 'blocks',
    location: 'fridge',
    shelfLife: 7,
    tags: ['extra-firm', 'organic'],
    quantityRange: [1, 3]
  },
  {
    name: 'Greek Yogurt',
    category: 'protein',
    unit: 'containers',
    location: 'fridge',
    shelfLife: 14,
    tags: ['plain', 'non-fat'],
    quantityRange: [1, 2]
  },
  {
    name: 'Canned Tuna',
    category: 'protein',
    unit: 'cans',
    location: 'pantry',
    shelfLife: 365,
    tags: ['albacore', 'water-packed'],
    quantityRange: [2, 6]
  },
  {
    name: 'Black Beans',
    category: 'protein',
    unit: 'cans',
    location: 'pantry',
    shelfLife: 730,
    tags: ['organic', 'no-salt-added'],
    quantityRange: [2, 4]
  },
  {
    name: 'Almonds',
    category: 'protein',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['raw', 'unsalted'],
    quantityRange: [1, 2]
  },
  {
    name: 'Peanut Butter',
    category: 'protein',
    unit: 'jars',
    location: 'pantry',
    shelfLife: 180,
    tags: ['natural', 'no-sugar'],
    quantityRange: [1, 1]
  },

  // Vegetables
  {
    name: 'Broccoli',
    category: 'vegetables',
    unit: 'heads',
    location: 'fridge',
    shelfLife: 7,
    tags: ['fresh', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Spinach',
    category: 'vegetables',
    unit: 'bags',
    location: 'fridge',
    shelfLife: 5,
    tags: ['baby', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Carrots',
    category: 'vegetables',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 21,
    tags: ['organic', 'baby'],
    quantityRange: [1, 2]
  },
  {
    name: 'Bell Peppers',
    category: 'vegetables',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 7,
    tags: ['red', 'organic'],
    quantityRange: [2, 4]
  },
  {
    name: 'Onions',
    category: 'vegetables',
    unit: 'pieces',
    location: 'pantry',
    shelfLife: 30,
    tags: ['yellow', 'large'],
    quantityRange: [3, 5]
  },
  {
    name: 'Garlic',
    category: 'vegetables',
    unit: 'heads',
    location: 'pantry',
    shelfLife: 30,
    tags: ['fresh', 'organic'],
    quantityRange: [2, 3]
  },
  {
    name: 'Tomatoes',
    category: 'vegetables',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 7,
    tags: ['vine-ripened', 'organic'],
    quantityRange: [4, 8]
  },
  {
    name: 'Cucumber',
    category: 'vegetables',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 7,
    tags: ['organic', 'English'],
    quantityRange: [1, 3]
  },
  {
    name: 'Zucchini',
    category: 'vegetables',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 5,
    tags: ['medium', 'organic'],
    quantityRange: [2, 4]
  },
  {
    name: 'Sweet Potatoes',
    category: 'vegetables',
    unit: 'lbs',
    location: 'pantry',
    shelfLife: 14,
    tags: ['orange', 'organic'],
    quantityRange: [2, 3]
  },
  {
    name: 'Potatoes',
    category: 'vegetables',
    unit: 'lbs',
    location: 'pantry',
    shelfLife: 21,
    tags: ['russet', 'organic'],
    quantityRange: [3, 5]
  },
  {
    name: 'Mushrooms',
    category: 'vegetables',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 7,
    tags: ['button', 'fresh'],
    quantityRange: [0.5, 1]
  },
  {
    name: 'Celery',
    category: 'vegetables',
    unit: 'bunches',
    location: 'fridge',
    shelfLife: 14,
    tags: ['organic', 'crisp'],
    quantityRange: [1, 1]
  },
  {
    name: 'Lettuce',
    category: 'vegetables',
    unit: 'heads',
    location: 'fridge',
    shelfLife: 7,
    tags: ['romaine', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Kale',
    category: 'vegetables',
    unit: 'bunches',
    location: 'fridge',
    shelfLife: 5,
    tags: ['curly', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Cabbage',
    category: 'vegetables',
    unit: 'heads',
    location: 'fridge',
    shelfLife: 14,
    tags: ['green', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Cauliflower',
    category: 'vegetables',
    unit: 'heads',
    location: 'fridge',
    shelfLife: 7,
    tags: ['white', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Green Beans',
    category: 'vegetables',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 5,
    tags: ['fresh', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Asparagus',
    category: 'vegetables',
    unit: 'bunches',
    location: 'fridge',
    shelfLife: 3,
    tags: ['thin', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Brussels Sprouts',
    category: 'vegetables',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 7,
    tags: ['fresh', 'organic'],
    quantityRange: [1, 2]
  },

  // Fruits
  {
    name: 'Bananas',
    category: 'fruits',
    unit: 'bunches',
    location: 'pantry',
    shelfLife: 7,
    tags: ['ripe', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Apples',
    category: 'fruits',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 21,
    tags: ['honeycrisp', 'organic'],
    quantityRange: [4, 8]
  },
  {
    name: 'Oranges',
    category: 'fruits',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 14,
    tags: ['navel', 'organic'],
    quantityRange: [4, 6]
  },
  {
    name: 'Berries',
    category: 'fruits',
    unit: 'containers',
    location: 'fridge',
    shelfLife: 5,
    tags: ['mixed', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Grapes',
    category: 'fruits',
    unit: 'lbs',
    location: 'fridge',
    shelfLife: 7,
    tags: ['red', 'seedless'],
    quantityRange: [1, 2]
  },
  {
    name: 'Lemons',
    category: 'fruits',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 14,
    tags: ['organic', 'meyer'],
    quantityRange: [3, 5]
  },
  {
    name: 'Limes',
    category: 'fruits',
    unit: 'pieces',
    location: 'fridge',
    shelfLife: 14,
    tags: ['organic', 'key'],
    quantityRange: [3, 5]
  },
  {
    name: 'Avocados',
    category: 'fruits',
    unit: 'pieces',
    location: 'pantry',
    shelfLife: 5,
    tags: ['hass', 'ripe'],
    quantityRange: [2, 4]
  },

  // Dairy
  {
    name: 'Milk',
    category: 'dairy',
    unit: 'gallons',
    location: 'fridge',
    shelfLife: 7,
    tags: ['2%', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Cheese',
    category: 'dairy',
    unit: 'blocks',
    location: 'fridge',
    shelfLife: 21,
    tags: ['cheddar', 'sharp'],
    quantityRange: [1, 2]
  },
  {
    name: 'Butter',
    category: 'dairy',
    unit: 'sticks',
    location: 'fridge',
    shelfLife: 30,
    tags: ['unsalted', 'organic'],
    quantityRange: [4, 8]
  },
  {
    name: 'Cream Cheese',
    category: 'dairy',
    unit: 'packages',
    location: 'fridge',
    shelfLife: 14,
    tags: ['regular', 'philadelphia'],
    quantityRange: [1, 2]
  },
  {
    name: 'Sour Cream',
    category: 'dairy',
    unit: 'containers',
    location: 'fridge',
    shelfLife: 14,
    tags: ['regular', 'organic'],
    quantityRange: [1, 1]
  },

  // Grains
  {
    name: 'Brown Rice',
    category: 'grains',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['long-grain', 'organic'],
    quantityRange: [2, 4]
  },
  {
    name: 'Quinoa',
    category: 'grains',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['tricolor', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Oats',
    category: 'grains',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['rolled', 'organic'],
    quantityRange: [2, 3]
  },
  {
    name: 'Pasta',
    category: 'grains',
    unit: 'boxes',
    location: 'pantry',
    shelfLife: 730,
    tags: ['whole-wheat', 'penne'],
    quantityRange: [2, 4]
  },
  {
    name: 'Bread',
    category: 'grains',
    unit: 'loaves',
    location: 'pantry',
    shelfLife: 5,
    tags: ['whole-grain', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Tortillas',
    category: 'grains',
    unit: 'packages',
    location: 'pantry',
    shelfLife: 14,
    tags: ['corn', 'organic'],
    quantityRange: [1, 2]
  },

  // Oils & Condiments
  {
    name: 'Olive Oil',
    category: 'oils',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 730,
    tags: ['extra-virgin', 'cold-pressed'],
    quantityRange: [1, 1]
  },
  {
    name: 'Coconut Oil',
    category: 'oils',
    unit: 'jars',
    location: 'pantry',
    shelfLife: 365,
    tags: ['virgin', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Soy Sauce',
    category: 'condiments',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 1095,
    tags: ['low-sodium', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Vinegar',
    category: 'condiments',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 1095,
    tags: ['apple-cider', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Hot Sauce',
    category: 'condiments',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 365,
    tags: ['sriracha', 'medium'],
    quantityRange: [1, 2]
  },
  {
    name: 'Mustard',
    category: 'condiments',
    unit: 'jars',
    location: 'pantry',
    shelfLife: 365,
    tags: ['dijon', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Ketchup',
    category: 'condiments',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 365,
    tags: ['organic', 'no-sugar'],
    quantityRange: [1, 1]
  },

  // Spices & Herbs
  {
    name: 'Salt',
    category: 'spices',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 1095,
    tags: ['sea-salt', 'fine'],
    quantityRange: [1, 1]
  },
  {
    name: 'Black Pepper',
    category: 'spices',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 1095,
    tags: ['ground', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Garlic Powder',
    category: 'spices',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 730,
    tags: ['organic', 'pure'],
    quantityRange: [1, 1]
  },
  {
    name: 'Paprika',
    category: 'spices',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 730,
    tags: ['sweet', 'hungarian'],
    quantityRange: [1, 1]
  },
  {
    name: 'Cumin',
    category: 'spices',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 730,
    tags: ['ground', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Oregano',
    category: 'herbs',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 365,
    tags: ['dried', 'mediterranean'],
    quantityRange: [1, 1]
  },
  {
    name: 'Basil',
    category: 'herbs',
    unit: 'packages',
    location: 'fridge',
    shelfLife: 7,
    tags: ['fresh', 'sweet'],
    quantityRange: [1, 2]
  },
  {
    name: 'Thyme',
    category: 'herbs',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 365,
    tags: ['dried', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Rosemary',
    category: 'herbs',
    unit: 'packages',
    location: 'fridge',
    shelfLife: 10,
    tags: ['fresh', 'organic'],
    quantityRange: [1, 1]
  },
  {
    name: 'Cilantro',
    category: 'herbs',
    unit: 'bunches',
    location: 'fridge',
    shelfLife: 7,
    tags: ['fresh', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Parsley',
    category: 'herbs',
    unit: 'bunches',
    location: 'fridge',
    shelfLife: 7,
    tags: ['flat-leaf', 'fresh'],
    quantityRange: [1, 1]
  },

  // Nuts & Seeds
  {
    name: 'Walnuts',
    category: 'nuts',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['raw', 'organic'],
    quantityRange: [1, 2]
  },
  {
    name: 'Cashews',
    category: 'nuts',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['raw', 'unsalted'],
    quantityRange: [1, 2]
  },
  {
    name: 'Sunflower Seeds',
    category: 'nuts',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['raw', 'hulled'],
    quantityRange: [1, 1]
  },
  {
    name: 'Chia Seeds',
    category: 'nuts',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 730,
    tags: ['organic', 'whole'],
    quantityRange: [0.5, 1]
  },
  {
    name: 'Flax Seeds',
    category: 'nuts',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['ground', 'organic'],
    quantityRange: [0.5, 1]
  },

  // Sweeteners
  {
    name: 'Honey',
    category: 'sweeteners',
    unit: 'jars',
    location: 'pantry',
    shelfLife: 1095,
    tags: ['raw', 'local'],
    quantityRange: [1, 1]
  },
  {
    name: 'Maple Syrup',
    category: 'sweeteners',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 365,
    tags: ['pure', 'grade-a'],
    quantityRange: [1, 1]
  },
  {
    name: 'Brown Sugar',
    category: 'sweeteners',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 730,
    tags: ['light', 'organic'],
    quantityRange: [1, 2]
  },

  // Baking
  {
    name: 'Flour',
    category: 'baking',
    unit: 'cups',
    location: 'pantry',
    shelfLife: 365,
    tags: ['all-purpose', 'organic'],
    quantityRange: [2, 4]
  },
  {
    name: 'Baking Soda',
    category: 'baking',
    unit: 'boxes',
    location: 'pantry',
    shelfLife: 730,
    tags: ['aluminum-free', 'pure'],
    quantityRange: [1, 1]
  },
  {
    name: 'Baking Powder',
    category: 'baking',
    unit: 'containers',
    location: 'pantry',
    shelfLife: 365,
    tags: ['double-acting', 'aluminum-free'],
    quantityRange: [1, 1]
  },
  {
    name: 'Vanilla Extract',
    category: 'baking',
    unit: 'bottles',
    location: 'pantry',
    shelfLife: 1095,
    tags: ['pure', 'organic'],
    quantityRange: [1, 1]
  },

  // Liquids
  {
    name: 'Vegetable Broth',
    category: 'liquids',
    unit: 'cartons',
    location: 'pantry',
    shelfLife: 365,
    tags: ['low-sodium', 'organic'],
    quantityRange: [2, 4]
  },
  {
    name: 'Chicken Broth',
    category: 'liquids',
    unit: 'cartons',
    location: 'pantry',
    shelfLife: 365,
    tags: ['low-sodium', 'organic'],
    quantityRange: [2, 4]
  },
  {
    name: 'Coconut Milk',
    category: 'liquids',
    unit: 'cans',
    location: 'pantry',
    shelfLife: 730,
    tags: ['full-fat', 'organic'],
    quantityRange: [2, 3]
  },
  {
    name: 'Almond Milk',
    category: 'liquids',
    unit: 'cartons',
    location: 'fridge',
    shelfLife: 7,
    tags: ['unsweetened', 'organic'],
    quantityRange: [1, 2]
  }
];

// Function to create ingredient from template
export function createIngredientFromTemplate(
  template: IngredientTemplate,
  index: number
): Ingredient {
  const now = new Date();
  const daysBought = Math.floor(Math.random() * 10); // 0-9 days ago
  const dateBought = new Date(now.getTime() - daysBought * 24 * 60 * 60 * 1000);
  const expirationDate = new Date(dateBought.getTime() + template.shelfLife * 24 * 60 * 60 * 1000);
  
  // Randomize quantity within range
  const quantity = template.quantityRange[0] + 
    Math.random() * (template.quantityRange[1] - template.quantityRange[0]);
  
  return {
    id: `demo-ing-${index + 1}`,
    name: template.name,
    customName: null,
    quantity: Math.round(quantity * 10) / 10, // Round to 1 decimal place
    unit: template.unit,
    dateBought,
    expirationDate,
    location: template.location,
    category: template.category,
    tags: [...template.tags],
    notes: template.notes || '',
    createdAt: dateBought,
    updatedAt: now
  };
}