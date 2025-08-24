'use client';

import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Flex,
  Grid,
  Container,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge
} from '@/components/ui';
import {
  AgentInterface,
  RecommendationCard,
  QuickActions,
  AgentInsights
} from './index';
import { AgentResponse } from '@/agents/types';

// Demo response data
const demoResponse: AgentResponse = {
  id: 'demo-response-1',
  agentType: 'sous-chef',
  message: "Based on your available ingredients, I recommend making a delicious Chicken Stir Fry! It's quick, healthy, and uses ingredients you already have.",
  intent: 'recipe-recommendation',
  confidence: 'high',
  priority: 'medium',
  data: {
    recipes: [
      {
        id: 'demo-recipe-1',
        name: 'Quick Chicken Stir Fry',
        description: 'A fast and flavorful stir fry with fresh vegetables and tender chicken.',
        category: 'Main Course',
        prepTime: 20,
        cookTime: 15,
        servings: 4,
        difficulty: 'Easy',
        ingredients: [
          { id: '1', name: 'Chicken breast', amount: 1, unit: 'lb' },
          { id: '2', name: 'Bell peppers', amount: 2, unit: 'pieces' },
          { id: '3', name: 'Soy sauce', amount: 3, unit: 'tbsp' },
          { id: '4', name: 'Garlic', amount: 3, unit: 'cloves' }
        ],
        instructions: [
          'Cut chicken into strips',
          'Heat oil in wok',
          'Stir fry chicken until golden',
          'Add vegetables and sauce',
          'Serve over rice'
        ],
        tags: ['Quick', 'Healthy', 'Asian'],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'demo-user'
      }
    ],
    shoppingItems: [
      { name: 'Chicken breast', category: 'Meat', amount: 1, unit: 'lb' },
      { name: 'Bell peppers', category: 'Vegetables', amount: 2, unit: 'pieces' },
      { name: 'Soy sauce', category: 'Condiments' },
      { name: 'Fresh ginger', category: 'Produce', amount: 1, unit: 'piece' }
    ],
    cookingTips: [
      {
        title: 'Perfect Stir Fry Technique',
        description: 'Keep the heat high and ingredients moving for the best texture and flavor.',
        difficulty: 'easy',
        tags: ['technique', 'stir-fry', 'cooking-method']
      }
    ]
  },
  followUpSuggestions: [
    "What side dishes go well with stir fry?",
    "How can I make this recipe vegetarian?",
    "Show me more quick dinner ideas"
  ],
  suggestedActions: [
    {
      label: 'View Full Recipe',
      action: 'view-recipe',
      data: { recipeId: 'demo-recipe-1' }
    },
    {
      label: 'Add to Meal Plan',
      action: 'add-to-meal-plan',
      data: { recipeId: 'demo-recipe-1' }
    },
    {
      label: 'Create Shopping List',
      action: 'create-shopping-list',
      data: { items: 'demo-shopping-items' }
    }
  ],
  metadata: {
    processingTime: 847,
    timestamp: new Date(),
    version: '1.0.0'
  }
};

export interface AgentDemoProps {
  className?: string;
}

export const AgentDemo: React.FC<AgentDemoProps> = ({ className }) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [activeDemo, setActiveDemo] = useState('interface');

  const handleRecommendationSelect = (recommendation: any) => {
    setSelectedRecommendation(recommendation);
    console.log('Recommendation selected:', recommendation);
  };

  const handleQuickAction = (action: any) => {
    console.log('Quick action triggered:', action);
  };

  return (
    <Container className={cn("py-6 space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader padding="md">
          <Flex justify="between" align="center">
            <div>
              <CardTitle>Agent Components Demo</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                Interactive demonstration of Sous Chef Agent UI components
              </div>
            </div>
            <Badge variant="outline">Demo Mode</Badge>
          </Flex>
        </CardHeader>
      </Card>

      {/* Component Demos */}
      <Tabs value={activeDemo} onValueChange={setActiveDemo}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="interface">Chat Interface</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Chat Interface Demo */}
        <TabsContent value="interface" className="space-y-4">
          <Grid cols={{ base: 1, lg: 2 }} gap="lg">
            <Card>
              <CardHeader padding="sm">
                <CardTitle className="text-lg">Full Chat Interface</CardTitle>
              </CardHeader>
              <CardContent padding="sm">
                <div className="h-96">
                  <AgentInterface
                    placeholder="Try asking: What's for dinner tonight?"
                    showHistory={true}
                    onRecommendationSelect={handleRecommendationSelect}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader padding="sm">
                <CardTitle className="text-lg">Compact Version</CardTitle>
              </CardHeader>
              <CardContent padding="sm">
                <div className="space-y-4">
                  <AgentInterface
                    compact={true}
                    placeholder="Quick query..."
                    showHistory={false}
                  />
                  
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                    <strong>Features demonstrated:</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• Natural language input with validation</li>
                      <li>• Voice input support (Chrome/Safari)</li>
                      <li>• Real-time response display</li>
                      <li>• Chat history management</li>
                      <li>• Loading states and error handling</li>
                      <li>• Mobile-responsive design</li>
                      <li>• Accessibility features (ARIA labels, keyboard navigation)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </TabsContent>

        {/* Recommendations Demo */}
        <TabsContent value="recommendations" className="space-y-4">
          <Grid cols={{ base: 1, xl: 2 }} gap="lg">
            <Card>
              <CardHeader padding="sm">
                <CardTitle className="text-lg">Recipe Recommendation</CardTitle>
              </CardHeader>
              <CardContent padding="sm">
                <RecommendationCard
                  response={demoResponse}
                  onAccept={handleRecommendationSelect}
                  onDecline={(rec) => console.log('Declined:', rec)}
                  onRate={(rec, rating) => console.log('Rated:', rec, rating)}
                  onViewDetails={(rec) => console.log('View details:', rec)}
                  showActions={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader padding="sm">
                <CardTitle className="text-lg">Compact Version</CardTitle>
              </CardHeader>
              <CardContent padding="sm">
                <RecommendationCard
                  response={demoResponse}
                  onAccept={handleRecommendationSelect}
                  compact={true}
                  showActions={true}
                />
                
                <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md mt-4">
                  <strong>Features demonstrated:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Rich recommendation display</li>
                    <li>• Multiple recommendation types (recipes, meal plans, shopping)</li>
                    <li>• User feedback collection</li>
                    <li>• Rating system with stars</li>
                    <li>• Confidence indicators</li>
                    <li>• Suggested actions</li>
                    <li>• Follow-up suggestions</li>
                    <li>• Mobile-optimized layouts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </TabsContent>

        {/* Quick Actions Demo */}
        <TabsContent value="quick-actions" className="space-y-4">
          <Grid cols={{ base: 1 }} gap="lg">
            <Card>
              <CardHeader padding="sm">
                <CardTitle className="text-lg">Contextual Quick Actions</CardTitle>
              </CardHeader>
              <CardContent padding="sm">
                <QuickActions
                  onActionClick={handleQuickAction}
                  showContextual={true}
                  maxActions={12}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader padding="sm">
                <CardTitle className="text-lg">Compact Quick Actions</CardTitle>
              </CardHeader>
              <CardContent padding="sm">
                <QuickActions
                  onActionClick={handleQuickAction}
                  compact={true}
                  showContextual={false}
                />
                
                <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md mt-4">
                  <strong>Features demonstrated:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Contextual action suggestions based on user state</li>
                    <li>• Time-based recommendations (breakfast, lunch, dinner)</li>
                    <li>• Ingredient expiration alerts</li>
                    <li>• Common query shortcuts</li>
                    <li>• Icon-based visual design</li>
                    <li>• Responsive grid layouts</li>
                    <li>• Badge indicators for urgency/status</li>
                    <li>• Touch-friendly mobile interface</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </TabsContent>

        {/* Insights Demo */}
        <TabsContent value="insights" className="space-y-4">
          <AgentInsights
            showUserPreferences={true}
            showCookingPatterns={true}
            showPersonalization={true}
            showPerformance={true}
            timeRange={30}
          />
          
          <Card>
            <CardContent padding="md">
              <div className="text-sm text-muted-foreground">
                <strong>Features demonstrated:</strong>
                <ul className="mt-2 space-y-1 text-xs grid grid-cols-1 md:grid-cols-2 gap-1">
                  <li>• User preference visualization</li>
                  <li>• Cooking pattern analytics</li>
                  <li>• Performance metrics dashboard</li>
                  <li>• Personalization insights</li>
                  <li>• Usage statistics</li>
                  <li>• Confidence tracking</li>
                  <li>• Response time monitoring</li>
                  <li>• Learning progress indicators</li>
                  <li>• Interactive charts and progress bars</li>
                  <li>• Time-range filtering</li>
                  <li>• Tabbed information organization</li>
                  <li>• Mobile-responsive dashboard</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile Responsiveness Info */}
      <Card>
        <CardHeader padding="md">
          <CardTitle>Mobile Responsiveness & Accessibility</CardTitle>
        </CardHeader>
        <CardContent padding="md">
          <Grid cols={{ base: 1, md: 2 }} gap="lg">
            <div>
              <h4 className="font-medium mb-2">Mobile Optimizations</h4>
              <ul className="text-sm space-y-1">
                <li>• Touch-friendly button sizes (min 44px)</li>
                <li>• Responsive grid layouts</li>
                <li>• Optimized text sizes and spacing</li>
                <li>• Swipe-friendly carousels</li>
                <li>• Mobile-first design approach</li>
                <li>• Efficient screen space utilization</li>
                <li>• Voice input optimization</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Accessibility Features</h4>
              <ul className="text-sm space-y-1">
                <li>• ARIA labels and descriptions</li>
                <li>• Keyboard navigation support</li>
                <li>• Focus management</li>
                <li>• Screen reader compatibility</li>
                <li>• High contrast support</li>
                <li>• Semantic HTML structure</li>
                <li>• Alt text for all icons</li>
              </ul>
            </div>
          </Grid>
          
          <div className="mt-4 p-4 bg-primary/5 rounded-md">
            <div className="text-sm">
              <strong>Integration Notes:</strong> All components integrate seamlessly with the existing 
              UI system, using the same design tokens, spacing, colors, and component patterns. They 
              support both light and dark themes and maintain consistency with the overall application design.
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
};