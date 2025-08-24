# Agent UI Components

Comprehensive UI components for the Sous Chef Agent system that integrate seamlessly with the existing design system and provide a rich, intuitive interface for AI-powered cooking assistance.

## Overview

This module provides 4 main components that work together to create a complete agent interaction experience:

1. **AgentInterface** - Natural language chat interface with voice support
2. **RecommendationCard** - Rich display for agent recommendations with actions
3. **QuickActions** - Contextual quick action buttons for common queries
4. **AgentInsights** - Analytics dashboard for user preferences and patterns

## Components

### AgentInterface

The main chat interface for interacting with the Sous Chef agent.

```tsx
import { AgentInterface } from '@/components/agents';

// Full chat interface
<AgentInterface
  placeholder="Ask me anything about recipes..."
  showHistory={true}
  onRecommendationSelect={handleSelect}
/>

// Compact version
<AgentInterface
  compact={true}
  showHistory={false}
/>
```

**Features:**
- Natural language input with real-time validation
- Voice input support (Chrome/Safari)
- Chat history with scrollable message list
- Loading states and typing indicators
- Error handling with user-friendly messages
- Mobile-optimized touch interactions
- Accessibility features (ARIA labels, keyboard navigation)

**Props:**
- `className?: string` - Custom CSS classes
- `onRecommendationSelect?: (recommendation: any) => void` - Callback for when user selects a recommendation
- `placeholder?: string` - Input placeholder text
- `showHistory?: boolean` - Whether to show chat history
- `compact?: boolean` - Compact layout mode

### RecommendationCard

Displays agent recommendations with rich content and interactive actions.

```tsx
import { RecommendationCard } from '@/components/agents';

<RecommendationCard
  response={agentResponse}
  onAccept={handleAccept}
  onDecline={handleDecline}
  onRate={handleRate}
  onViewDetails={handleViewDetails}
  showActions={true}
/>
```

**Features:**
- Multiple recommendation types (recipes, meal plans, shopping lists, cooking tips)
- User feedback collection (accept/decline/rate)
- Confidence indicators and processing time display
- Follow-up suggestions
- Suggested actions with callbacks
- Rating system with star interface
- Mobile-responsive card layouts

**Props:**
- `response: AgentResponse` - The agent response to display
- `onAccept?: (recommendation: any) => void` - Accept recommendation callback
- `onDecline?: (recommendation: any) => void` - Decline recommendation callback
- `onRate?: (recommendation: any, rating: number) => void` - Rating callback
- `onViewDetails?: (recommendation: any) => void` - View details callback
- `showActions?: boolean` - Whether to show action buttons
- `compact?: boolean` - Compact display mode

### QuickActions

Provides contextual quick action buttons for common cooking queries.

```tsx
import { QuickActions } from '@/components/agents';

// Full version with contextual actions
<QuickActions
  onActionClick={handleAction}
  showContextual={true}
  maxActions={12}
/>

// Compact horizontal scroll version
<QuickActions
  compact={true}
  showContextual={false}
/>
```

**Features:**
- Contextual suggestions based on user state
- Time-based recommendations (breakfast, lunch, dinner)
- Ingredient expiration alerts
- Common query shortcuts
- Icon-based visual design
- Responsive grid layouts
- Badge indicators for urgency/status

**Props:**
- `onActionClick?: (action: QuickAction) => void` - Action click callback
- `showContextual?: boolean` - Show contextual suggestions
- `compact?: boolean` - Compact horizontal layout
- `maxActions?: number` - Maximum actions to display

### AgentInsights

Analytics dashboard showing user preferences, patterns, and agent performance.

```tsx
import { AgentInsights } from '@/components/agents';

<AgentInsights
  showUserPreferences={true}
  showCookingPatterns={true}
  showPersonalization={true}
  showPerformance={true}
  timeRange={30}
/>
```

**Features:**
- User preference visualization
- Cooking pattern analytics
- Performance metrics dashboard
- Personalization insights
- Interactive charts and progress bars
- Time-range filtering
- Tabbed information organization

**Props:**
- `showUserPreferences?: boolean` - Show user preferences tab
- `showCookingPatterns?: boolean` - Show cooking patterns tab
- `showPersonalization?: boolean` - Show personalization insights
- `showPerformance?: boolean` - Show performance metrics
- `timeRange?: number` - Time range in days for analytics
- `agentType?: string` - Specific agent type to analyze

## Integration

### Basic Usage

```tsx
import { AgentInterface, QuickActions, RecommendationCard } from '@/components/agents';
import { useAgent } from '@/hooks/useAgent';

function CookingAssistant() {
  const { sendQuery, history, isProcessing } = useAgent();

  return (
    <div className="space-y-6">
      {/* Quick actions for common queries */}
      <QuickActions
        onActionClick={async (action) => {
          await sendQuery(action.query, action.intent);
        }}
        showContextual={true}
      />

      {/* Main chat interface */}
      <AgentInterface
        showHistory={true}
        onRecommendationSelect={(rec) => {
          // Handle recommendation selection
          console.log('Selected:', rec);
        }}
      />

      {/* Display recommendations from chat history */}
      {history.map(({ response }) => (
        <RecommendationCard
          key={response.id}
          response={response}
          onAccept={(rec) => {
            // Add to meal plan, save recipe, etc.
          }}
          showActions={true}
        />
      ))}
    </div>
  );
}
```

### Advanced Usage

```tsx
import { useState } from 'react';
import { 
  AgentInterface, 
  QuickActions, 
  RecommendationCard, 
  AgentInsights 
} from '@/components/agents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';

function AdvancedCookingAssistant() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="quick">Quick Actions</TabsTrigger>
        <TabsTrigger value="insights">Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="chat">
        <AgentInterface showHistory={true} />
      </TabsContent>

      <TabsContent value="quick">
        <QuickActions showContextual={true} />
      </TabsContent>

      <TabsContent value="insights">
        <AgentInsights
          showUserPreferences={true}
          showCookingPatterns={true}
          showPerformance={true}
          timeRange={30}
        />
      </TabsContent>
    </Tabs>
  );
}
```

## Design System Integration

All components are built using the existing UI component system and follow the established design patterns:

- **Colors**: Uses CSS custom properties from `globals.css`
- **Typography**: Consistent with existing text scales and weights
- **Spacing**: Follows the established spacing system
- **Components**: Built on top of existing UI components (Card, Button, Input, etc.)
- **Themes**: Supports both light and dark themes automatically
- **Responsive**: Mobile-first responsive design with breakpoint utilities

## Accessibility

All components include comprehensive accessibility features:

- **ARIA Labels**: Descriptive labels for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling and indicators
- **Semantic HTML**: Proper heading hierarchy and semantic structure
- **High Contrast**: Support for high contrast themes
- **Screen Readers**: Compatible with screen reader software

## Mobile Responsiveness

Components are optimized for mobile devices:

- **Touch Targets**: Minimum 44px touch targets
- **Responsive Layouts**: Adaptive grid systems
- **Text Sizing**: Optimized font sizes for mobile
- **Voice Input**: Mobile voice input optimization
- **Gestures**: Support for touch gestures where appropriate

## Performance

Components are optimized for performance:

- **Code Splitting**: Components can be imported individually
- **Lazy Loading**: Non-critical content loaded on demand
- **Memoization**: React.memo and useMemo used where beneficial
- **Efficient Rendering**: Minimal re-renders through proper dependency management
- **Bundle Size**: Tree-shakeable exports

## Testing

A comprehensive demo component (`AgentDemo`) is provided for testing all features:

```tsx
import { AgentDemo } from '@/components/agents';

// Renders interactive demo of all components
<AgentDemo />
```

The demo includes:
- Interactive examples of all components
- Mobile responsiveness testing
- Feature demonstrations
- Integration examples

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Voice Input**: Chrome and Safari (WebKit Speech Recognition)
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Browser
- **Accessibility**: Compatible with NVDA, JAWS, VoiceOver

## Dependencies

Components depend only on existing project dependencies:

- React 18+
- Existing UI component system
- Agent hook system (`useAgent`)
- Authentication context (`useAuth`)
- Utility functions (`cn` from utils)

No additional external dependencies are required.