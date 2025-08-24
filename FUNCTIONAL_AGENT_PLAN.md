# RefrigeratorRecipes - Functional Sous Chef Agent Implementation Plan

## **Executive Summary**

This document outlines the complete implementation plan for transforming the current demo-mode Sous Chef Agent into a fully functional AI cooking assistant. The plan leverages existing app data (ingredients, recipes, meal plans, shopping lists) to provide intelligent, context-aware responses and actionable recommendations.

---

## **🎯 Core Agent Capabilities**

### **1. Ingredient Intelligence**
- **Expiration Management**: Monitor and alert about expiring ingredients
- **Recipe Discovery**: Find recipes based on available ingredients
- **Inventory Optimization**: Suggest ways to use excess ingredients
- **Purchase Recommendations**: Smart shopping suggestions

### **2. Recipe Intelligence**
- **Contextual Suggestions**: Time-aware, skill-appropriate recommendations
- **Dietary Matching**: Filter by allergies, preferences, nutrition goals
- **Skill Progression**: Gradually introduce more complex recipes
- **Cuisine Exploration**: Diversify cooking styles and techniques

### **3. Meal Planning Intelligence**
- **Weekly Planning**: Generate balanced meal plans
- **Nutritional Analysis**: Ensure dietary balance and variety
- **Ingredient Optimization**: Plan meals to minimize waste
- **Prep Strategy**: Suggest meal prep and batch cooking opportunities

### **4. Shopping Intelligence**
- **List Generation**: Auto-create shopping lists from meal plans
- **Cost Optimization**: Bulk buying, seasonal suggestions, alternatives
- **Store Navigation**: Group items by store sections
- **Budget Management**: Track spending and suggest savings

### **5. Waste Reduction Intelligence**
- **Leftover Transformation**: Creative recipes for leftovers
- **Preservation Tips**: Storage and preservation recommendations
- **Usage Prioritization**: Order ingredients by expiration urgency
- **Batch Cooking**: Suggest large-batch recipes for excess ingredients

---

## **🏗️ Technical Architecture**

### **Intent Classification System**

```typescript
enum QueryIntent {
  // Ingredient-focused
  INGREDIENT_EXPIRATION = 'ingredient-expiration',
  INGREDIENT_RECIPE_SEARCH = 'ingredient-recipe-search',
  INGREDIENT_USAGE = 'ingredient-usage',
  
  // Recipe-focused
  RECIPE_SUGGESTION = 'recipe-suggestion',
  RECIPE_FILTER = 'recipe-filter',
  RECIPE_DIFFICULTY = 'recipe-difficulty',
  
  // Meal planning
  MEAL_PLAN_GENERATION = 'meal-plan-generation',
  MEAL_PLAN_ANALYSIS = 'meal-plan-analysis',
  MEAL_SCHEDULE = 'meal-schedule',
  
  // Shopping
  SHOPPING_LIST_CREATE = 'shopping-list-create',
  SHOPPING_OPTIMIZATION = 'shopping-optimization',
  BUDGET_HELP = 'budget-help',
  
  // General help
  COOKING_TIPS = 'cooking-tips',
  GENERAL_HELP = 'general-help'
}
```

### **Response Generation Pipeline**

```
Query Input → Intent Classification → Context Gathering → Response Generation → Action Execution
```

1. **Intent Classification**: Pattern matching + keyword extraction
2. **Context Gathering**: Fetch relevant user data (ingredients, recipes, etc.)
3. **Response Generation**: Create personalized, actionable responses
4. **Action Execution**: Perform requested actions (add to meal plan, create shopping list)

---

## **📊 Implementation Phases**

### **Phase 1: Foundation (Week 1-2)**
- ✅ **UI Infrastructure**: Complete (modern chat interface)
- ✅ **Demo System**: Complete (working chat with mock responses)
- 🔄 **Intent Classifier**: Pattern-based query understanding
- 🔄 **Basic Responses**: Context-aware answers using app data

### **Phase 2: Core Intelligence (Week 3-4)**
- 🔄 **Ingredient Intelligence**: Expiration alerts, recipe matching
- 🔄 **Recipe Intelligence**: Smart suggestions based on context
- 🔄 **Action Integration**: Execute user requests (add recipes, create lists)
- 🔄 **Data Integration**: Full connection to existing hooks (useIngredients, useRecipes, etc.)

### **Phase 3: Advanced Features (Week 5-6)**
- 🔄 **Meal Planning**: Generate and analyze meal plans
- 🔄 **Shopping Optimization**: Smart list creation and cost savings
- 🔄 **Learning System**: Remember user preferences and patterns
- 🔄 **Multi-turn Conversations**: Context retention across messages

### **Phase 4: Intelligence & Learning (Week 7-8)**
- 🔄 **Predictive Suggestions**: Anticipate user needs
- 🔄 **Seasonal Awareness**: Time-based ingredient and recipe suggestions
- 🔄 **Advanced Analytics**: Nutrition tracking, waste reduction metrics
- 🔄 **Voice Integration**: Enhanced voice command support

---

## **🎭 User Interaction Patterns**

### **Common Query Types & Responses**

#### **Ingredient-Based Queries**
```
User: "What's expiring soon?"
Agent: "You have 3 ingredients expiring this week:
• Spinach (expires in 2 days) - Try my Spinach & Feta Quiche
• Chicken breast (expires in 3 days) - Perfect for Lemon Herb Chicken
• Greek yogurt (expires in 4 days) - Great for smoothies or marinades

Would you like me to add any of these recipes to your meal plan?"
```

#### **Recipe Discovery**
```
User: "I have chicken and rice, what can I make?"
Agent: "Great combination! Based on your ingredients, here are 3 recipes:

🍽️ **Chicken Fried Rice** (20 mins, Easy)
✓ Uses: chicken, rice, + 3 ingredients you have
✓ Perfect for tonight's dinner

🍛 **Mediterranean Chicken Bowl** (25 mins, Easy)  
✓ Uses: chicken, rice, + your fresh herbs
✓ Healthy and filling

🍲 **One-Pot Chicken & Rice** (35 mins, Medium)
✓ Complete meal with vegetables
✓ Great for meal prep

Which one sounds good? I can add it to tonight's meal plan!"
```

#### **Meal Planning**
```
User: "Plan my meals for this week"
Agent: "I've created a balanced meal plan using your available ingredients:

📅 **This Week's Plan**
• Monday: Lemon Herb Chicken (uses expiring chicken)
• Tuesday: Spinach Pasta (uses expiring spinach) 
• Wednesday: Leftover transformation day
• Thursday: New recipe: Thai Basil Stir-fry
• Friday: Easy Friday: One-pot meals
• Weekend: Meal prep day

🛒 **Shopping needed**: 8 ingredients ($34 estimated)
♻️ **Waste reduction**: 95% of current ingredients used

Would you like me to create the shopping list?"
```

---

## **⚙️ Technical Implementation Details**

### **Intent Classification Logic**

```typescript
class IntentClassifier {
  classify(query: string): QueryIntent {
    const patterns = {
      [QueryIntent.INGREDIENT_EXPIRATION]: [
        /what.*expir/i,
        /expir.*soon/i,
        /going.*bad/i,
        /use.*up/i
      ],
      [QueryIntent.INGREDIENT_RECIPE_SEARCH]: [
        /have.*make/i,
        /cook.*with/i,
        /recipe.*for.*[ingredient]/i,
        /what.*can.*i.*cook/i
      ],
      [QueryIntent.MEAL_PLAN_GENERATION]: [
        /plan.*meal/i,
        /this.*week/i,
        /meal.*plan/i,
        /what.*eat/i
      ]
      // ... more patterns
    };
    
    // Pattern matching + keyword scoring
    return this.getBestMatch(query, patterns);
  }
}
```

### **Response Generation Engine**

```typescript
class ResponseGenerator {
  async generateResponse(
    intent: QueryIntent, 
    query: string, 
    userContext: UserContext
  ): Promise<AgentResponse> {
    
    switch (intent) {
      case QueryIntent.INGREDIENT_EXPIRATION:
        return await this.generateExpirationResponse(userContext);
      
      case QueryIntent.INGREDIENT_RECIPE_SEARCH:
        const ingredients = this.extractIngredients(query);
        return await this.findRecipesWithIngredients(ingredients, userContext);
      
      case QueryIntent.MEAL_PLAN_GENERATION:
        return await this.generateMealPlan(userContext);
      
      // ... more cases
    }
  }
  
  private async generateExpirationResponse(context: UserContext) {
    const expiringIngredients = context.availableIngredients
      .filter(ingredient => this.isExpiringSoon(ingredient))
      .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    
    if (expiringIngredients.length === 0) {
      return {
        message: "Good news! No ingredients are expiring soon. Your food storage is well-managed!",
        suggestedActions: [
          { action: 'view-inventory', label: 'View all ingredients' }
        ]
      };
    }
    
    const recipesuggestions = await this.findRecipesForIngredients(
      expiringIngredients.map(i => i.name)
    );
    
    return {
      message: this.formatExpirationAlert(expiringIngredients, recipesuggestions),
      suggestedActions: this.createExpirationActions(recipesSuggestions),
      followUpSuggestions: [
        "What can I meal prep this weekend?",
        "Show me more recipes with these ingredients",
        "Help me create a shopping list"
      ]
    };
  }
}
```

### **Action Integration**

```typescript
class AgentActionExecutor {
  constructor(
    private ingredientsHook: UseIngredientsReturn,
    private recipesHook: UseRecipesReturn,
    private mealPlanHook: UseMealPlanReturn,
    private shoppingHook: UseShoppingListReturn
  ) {}
  
  async executeAction(action: AgentAction): Promise<void> {
    switch (action.type) {
      case 'add-to-meal-plan':
        await this.mealPlanHook.addMealToSlot(
          action.data.recipeId,
          action.data.day,
          action.data.mealType
        );
        break;
        
      case 'create-shopping-list':
        const ingredients = await this.calculateMissingIngredients(
          action.data.recipes
        );
        await this.shoppingHook.createShoppingList({
          name: `Shopping for ${action.data.weekOf}`,
          items: ingredients
        });
        break;
        
      case 'mark-ingredient-used':
        await this.ingredientsHook.updateIngredient(
          action.data.ingredientId,
          { quantity: action.data.newQuantity }
        );
        break;
    }
  }
}
```

---

## **🚀 Success Metrics**

### **User Engagement**
- **Query Success Rate**: >85% of queries result in helpful responses
- **Action Completion**: >70% of suggested actions are executed
- **Session Length**: Average 5+ messages per conversation

### **App Impact** 
- **Food Waste Reduction**: 30% decrease in expired ingredients
- **Meal Plan Completion**: 60% increase in planned vs. actual meals
- **Recipe Discovery**: 40% more diverse recipe usage

### **Technical Performance**
- **Response Time**: <2 seconds for all queries
- **Accuracy**: >90% correct intent classification
- **Context Retention**: Multi-turn conversations work seamlessly

---

## **🔧 Development Priorities**

### **Immediate (Next Sprint)**
1. **Intent Classification System**: Core pattern matching
2. **Basic Data Integration**: Connect to useIngredients, useRecipes
3. **Expiration Alerts**: First functional use case
4. **Recipe Matching**: Ingredient-based recipe search

### **Short Term (1-2 Sprints)**
1. **Meal Planning Intelligence**: Generate weekly plans  
2. **Shopping List Creation**: Auto-generate from meal plans
3. **Action Execution**: Actually perform user requests
4. **Multi-turn Context**: Remember conversation history

### **Medium Term (3-4 Sprints)**
1. **Advanced Analytics**: Nutrition tracking, waste metrics
2. **Learning System**: User preference memory
3. **Predictive Suggestions**: Anticipate needs
4. **Voice Enhancement**: Better voice command support

---

## **🎯 Next Steps**

1. **Review & Approve Plan**: Stakeholder sign-off on approach
2. **Start Phase 1**: Begin with intent classification system
3. **Create Test Cases**: Define success scenarios for each capability
4. **Implement Iteratively**: Build and test one capability at a time

**The foundation is 95% complete. We're ready to build a truly intelligent cooking assistant.**