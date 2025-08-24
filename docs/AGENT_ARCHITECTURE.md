# Sous Chef Agent System Architecture

This document describes the foundational architecture for the Sous Chef Agent system, a comprehensive AI-powered assistance system for the Refrigerator Recipes application.

## Overview

The Sous Chef Agent system is built on a modular, extensible architecture that provides intelligent assistance across all aspects of meal planning, recipe management, and cooking guidance. The system follows the existing patterns and conventions of the Refrigerator Recipes codebase while introducing a sophisticated agent-based architecture.

## Architecture Components

### 1. Type System (`src/agents/types.ts`)

The core type system provides comprehensive TypeScript interfaces that ensure type safety across the entire agent system:

#### Core Types
- `QueryIntent`: Defines the different types of user queries (recipe-search, meal-planning, etc.)
- `AgentRequest`: Structured request object containing query, context, and metadata
- `AgentResponse`: Standardized response format with message, data, and confidence levels
- `UserContext`: Complete user state including ingredients, preferences, and session info
- `AgentConfig`: Configuration for agent behavior and capabilities

#### User Management Types
- `UserInteraction`: Tracks user interactions for learning and analytics
- `UserAgentPreferences`: Stores user preferences and learned behaviors
- `AgentState`: Manages agent processing state and metrics

### 2. Base Agent Architecture (`src/agents/base/`)

#### BaseSousChefAgent Class
Abstract base class that all agents must extend, providing:

- **Request Processing**: Standardized request handling with timeout management
- **Error Handling**: Consistent error responses and logging
- **Validation**: Request and response structure validation
- **Helper Methods**: Confidence calculation, priority determination, context extraction

#### AgentRegistry Class
Singleton registry that manages all available agents:

- **Agent Registration**: Dynamic agent registration and discovery
- **Request Routing**: Finds the best agent for each request based on capabilities and priority
- **Agent Management**: Enable/disable agents, get configurations

### 3. Service Integration (`src/agents/services/`)

#### AgentInteractionService
Extends `BaseFirebaseService` to handle user interaction storage:

- **Interaction Recording**: Stores requests, responses, and user feedback
- **Session Management**: Groups interactions by session for context
- **Analytics Support**: Provides data for learning and performance metrics

#### AgentPreferencesService
Manages user preferences and learned behaviors:

- **Preference Storage**: User settings for agent behavior
- **Learning Integration**: Stores patterns learned from user interactions
- **Privacy Controls**: Manages data collection and personalization settings

#### AgentAnalyticsService
Provides intelligence and learning capabilities:

- **Performance Metrics**: Success rates, response times, user satisfaction
- **Pattern Learning**: Analyzes user behavior to improve recommendations
- **Preference Updates**: Updates learned preferences based on successful interactions

### 4. Hook Integration (`src/hooks/useAgent.ts`)

#### useAgent Hook
Main hook providing agent functionality:

- **Query Processing**: Send queries to the agent system
- **State Management**: Tracks processing status and history
- **Context Building**: Automatically builds user context from app state
- **Feedback Integration**: Allows users to rate and provide feedback on responses

#### useAgentAnalytics Hook
Specialized hook for agent performance monitoring:

- **Metrics Display**: Shows agent performance data
- **Analytics Loading**: Handles async loading of analytics data
- **Error Handling**: Manages analytics-related errors

## Integration with Existing Systems

### Firebase Integration
The agent system seamlessly integrates with the existing Firebase infrastructure:

- **Security Rules**: Follows existing security patterns with user-based access
- **Data Structure**: Uses the established user-scoped collections pattern
- **Service Architecture**: Extends `BaseFirebaseService` for consistency

### Authentication Integration
Complete integration with the existing auth system:

- **User Context**: Automatically includes authenticated user information
- **Session Management**: Maintains session state across user interactions
- **Demo Mode**: Supports the existing demo mode functionality

### Hook Pattern Integration
Follows existing hook patterns in the codebase:

- **State Management**: Consistent with `useRecipes`, `useIngredients`, etc.
- **Error Handling**: Follows established error handling patterns
- **Loading States**: Provides loading states consistent with other hooks

## Usage Examples

### Basic Agent Usage
```typescript
import { useAgent } from '@/hooks';

const ChatComponent = () => {
  const { sendQuery, state, history, isProcessing } = useAgent();

  const handleQuery = async (query: string) => {
    const response = await sendQuery(query, 'recipe-search');
    console.log(response.message);
  };

  return (
    <div>
      {/* Chat interface */}
    </div>
  );
};
```

### Creating a Custom Agent
```typescript
import { BaseSousChefAgent, AgentRequest, AgentResponse } from '@/agents';

class RecipeSearchAgent extends BaseSousChefAgent {
  protected config = {
    id: 'recipe-search',
    name: 'Recipe Search Agent',
    supportedIntents: ['recipe-search'],
    priority: 10,
    maxProcessingTime: 5000,
    enabled: true,
    settings: {}
  };

  protected canHandle(request: AgentRequest): boolean {
    return request.intent === 'recipe-search' || 
           request.query.toLowerCase().includes('recipe');
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    // Implementation here
    return this.createResponse(request, "Here are some recipes...");
  }
}
```

### Service Usage
```typescript
import { agentInteractionService, agentPreferencesService } from '@/agents';

// Record an interaction
await agentInteractionService.recordInteraction(userId, sessionId, request, response);

// Update user preferences
await agentPreferencesService.updateUserPreferences(userId, {
  responseStyle: 'detailed',
  autoSuggestions: true
});
```

## Security Considerations

### Data Privacy
- User interactions are stored with privacy controls
- Learned preferences can be disabled by users
- Anonymous analytics options available

### Access Control
- All operations require authenticated users
- User data is scoped to individual user collections
- Follows existing Firebase security rules

### Error Handling
- Sensitive information is not exposed in error messages
- All errors are logged for debugging without user data
- Graceful degradation when services are unavailable

## Performance Considerations

### Caching
- Agent responses can be cached for repeated queries
- User context is efficiently built from existing app state
- Preferences are cached to reduce Firebase reads

### Async Operations
- All agent operations are non-blocking
- Timeout management prevents hanging requests
- Background analytics updates don't block user interactions

### Scalability
- Agent registry supports dynamic agent loading
- Service classes are designed for high concurrency
- Firebase operations are optimized for performance

## Extension Points

### Adding New Agents
1. Extend `BaseSousChefAgent`
2. Implement required abstract methods
3. Register with `AgentRegistry`
4. Configure supported intents and priority

### Custom Response Types
1. Extend `AgentResponseData` interface
2. Update type validation as needed
3. Implement UI components for new data types

### Additional Services
1. Extend existing service classes
2. Follow Firebase service patterns
3. Update hook integrations as needed

## Testing Strategy

### Unit Tests
- All service classes have comprehensive unit tests
- Agent base classes include test utilities
- Type guards have dedicated test coverage

### Integration Tests
- End-to-end agent interaction flows
- Firebase integration testing
- Authentication integration tests

### Performance Tests
- Agent response time monitoring
- Firebase query optimization
- Memory usage tracking

## Future Enhancements

### Planned Features
- Voice interaction support
- Multi-language responses
- Advanced learning algorithms
- Integration with external recipe APIs

### Architecture Improvements
- Agent composition for complex queries
- Streaming responses for long operations
- Advanced caching strategies
- Real-time collaboration features

This architecture provides a solid foundation for building sophisticated AI-powered assistance while maintaining consistency with the existing codebase patterns and ensuring excellent developer experience for future enhancements.