'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Loading,
  Flex,
  Badge,
  Alert
} from '@/components/ui';
import { useAgent } from '@/hooks/useAgent';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useRecipes } from '@/hooks/useRecipes';
import { QueryIntent, AgentResponse, AgentRequest } from '@/agents/types';
import { Recipe } from '@/types';

// Icons - using simple SVG icons since no icon library is imported
const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const MicIcon = ({ isListening }: { isListening: boolean }) => (
  <svg className={cn("h-4 w-4", isListening && "text-destructive animate-pulse")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BotIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChefHatIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.686 2 6 4.686 6 8c0 1.657.672 3.157 1.757 4.243L12 16.486l4.243-4.243C17.328 11.157 18 9.657 18 8c0-3.314-2.686-6-6-6z M12 5a3 3 0 100 6 3 3 0 000-6z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export interface AgentInterfaceProps {
  className?: string;
  onRecommendationSelect?: (recommendation: any) => void;
  placeholder?: string;
  showHistory?: boolean;
  compact?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp?: Date | string;
  intent?: QueryIntent;
  response?: AgentResponse;
  confidence?: string | number;
}

export const AgentInterface: React.FC<AgentInterfaceProps> = ({
  className,
  onRecommendationSelect,
  placeholder = "Ask me anything about recipes, ingredients, or meal planning...",
  showHistory = true,
  compact = false
}) => {
  // Agent hook integration
  const {
    sendQuery,
    state,
    history: agentHistory,
    clearHistory,
    isProcessing,
    error,
    clearError
  } = useAgent();

  // Additional hooks for recipe actions
  const { currentWeekPlan, addMealToPlan, loadOrCreateWeekPlan } = useMealPlan();
  const { addRecipe, recipes } = useRecipes();
  const router = useRouter();

  // Local state
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [addingToMealPlan, setAddingToMealPlan] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      setIsVoiceSupported(true);
    }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert agent history to chat messages
  useEffect(() => {
    const chatMessages: ChatMessage[] = [];
    
    agentHistory.forEach(({ request, response, timestamp }) => {
      // Add user message
      chatMessages.push({
        id: `user-${request.id}`,
        type: 'user',
        content: request.query,
        timestamp: request.metadata?.timestamp || timestamp || new Date(),
        intent: request.intent
      });

      // Add agent response
      chatMessages.push({
        id: `agent-${response.id}`,
        type: 'agent',
        content: response.message || response.content || 'No response',
        timestamp: response.metadata?.timestamp || new Date(),
        response,
        confidence: response.confidence
      });
    });

    setMessages(chatMessages);
  }, [agentHistory]);

  // Handle voice input
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  // Handle query submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || isProcessing) return;

    const currentQuery = query.trim();
    setQuery('');
    
    try {
      await sendQuery(currentQuery);
    } catch (error) {
      console.error('Error sending query:', error);
    }
  };

  // Handle clear history
  const handleClearHistory = () => {
    clearHistory();
    setMessages([]);
  };

  // Handle recipe interactions
  const handleRecipeClick = (recipe: Recipe) => {
    console.log('Recipe clicked:', recipe.name);
    // Always open in new tab for better UX
    if (recipe.sourceUrl) {
      window.open(recipe.sourceUrl, '_blank');
    } else if (recipe.metadata?.isOnlineRecipe) {
      // Fallback: try to find the recipe online
      const searchQuery = encodeURIComponent(recipe.name);
      window.open(`https://www.google.com/search?q=${searchQuery}+recipe`, '_blank');
    } else {
      // For saved recipes without URL, search online as fallback
      const searchQuery = encodeURIComponent(recipe.name);
      window.open(`https://www.google.com/search?q=${searchQuery}+recipe`, '_blank');
    }
  };

  const handleAddToMealPlan = async (recipe: Recipe) => {
    setAddingToMealPlan(recipe.id);
    
    try {
      console.log('Adding to meal plan:', recipe.name);
      
      // Get or create current week plan
      const weekPlan = currentWeekPlan || await loadOrCreateWeekPlan(new Date());
      
      if (recipe.metadata?.isOnlineRecipe) {
        // First save the online recipe
        const savedRecipe = await addRecipe({
          title: recipe.name,
          description: recipe.description || '',
          ingredients: recipe.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.quantity,
            unit: ing.unit || '',
            category: ing.category || 'other',
            notes: ''
          })),
          instructions: recipe.instructions,
          prepTime: recipe.prepTime || 15,
          cookTime: recipe.cookTime || 30,
          servingsCount: recipe.servingsCount || 4,
          difficulty: recipe.difficulty || 'medium',
          mealType: recipe.mealType || 'dinner',
          cuisineType: recipe.cuisineType || 'international',
          tags: recipe.tags || [],
          images: recipe.images || [],
          sourceUrl: recipe.sourceUrl
        });
        // Update recipe ID to use the saved recipe's ID
        recipe.id = savedRecipe?.id || recipe.id;
      }
      
      // Create a meal slot for today's dinner
      const today = new Date();
      const mealSlot = {
        id: `meal-${Date.now()}`,
        date: today,
        mealType: 'dinner' as const,
        recipeId: recipe.id,
        recipeTitle: recipe.name,
        servings: recipe.servingsCount || 4,
        notes: `Added via Sous Chef Agent`
      };
      
      // Add to meal plan
      await addMealToPlan(weekPlan.id, mealSlot);
      
      // Show success feedback
      console.log(`✅ Added "${recipe.name}" to today's dinner!`);
      
      // Send a follow-up query to show the updated meal plan
      setQuery(`Show me today's meal plan`);
      setTimeout(() => {
        sendQuery(`Show me today's meal plan`);
      }, 500);
      
    } catch (error) {
      console.error('Error adding recipe to meal plan:', error);
      // Show user-friendly error message
      console.log(`❌ Couldn't add "${recipe.name}" to meal plan. Please try again.`);
    } finally {
      setAddingToMealPlan(null);
    }
  };

  const handleViewRecipe = async (recipe: Recipe) => {
    console.log('Viewing recipe details:', recipe.name);
    
    // First, check if this recipe exists in our saved recipes
    const savedRecipe = recipes?.find(r => 
      r.id === recipe.id || 
      r.title?.toLowerCase() === recipe.name?.toLowerCase() ||
      r.name?.toLowerCase() === recipe.name?.toLowerCase()
    );
    
    if (savedRecipe) {
      // Navigate to recipes page with the recipe selected/highlighted
      // For now, navigate to recipes page - you can enhance this to show a specific recipe later
      router.push(`/recipes?selected=${savedRecipe.id}`);
      return;
    }
    
    // If we have a direct source URL, use it
    if (recipe.sourceUrl) {
      window.open(recipe.sourceUrl, '_blank');
      return;
    }
    
    if (recipe.metadata?.isOnlineRecipe && recipe.metadata?.originalUrl) {
      window.open(recipe.metadata.originalUrl, '_blank');
      return;
    }
    
    // Enhanced fallback: Try to get a top-rated recipe from popular cooking sites
    const recipeName = recipe.name;
    const searchQueries = [
      // Try highly-rated recipe sites first
      `site:allrecipes.com "${recipeName}" recipe`,
      `site:foodnetwork.com "${recipeName}" recipe`, 
      `site:epicurious.com "${recipeName}" recipe`,
      `site:bonappetit.com "${recipeName}" recipe`,
      `site:seriouseats.com "${recipeName}" recipe`,
      // Fallback to general search with quality indicators
      `"${recipeName}" recipe "5 stars" OR "highly rated" OR "best"`
    ];
    
    // Use the "I'm Feeling Lucky" approach - go directly to the first result
    const luckySearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQueries[0])}&btnI=1`;
    
    try {
      // Open the "I'm Feeling Lucky" result which should take us directly to the top result
      window.open(luckySearchUrl, '_blank');
    } catch (error) {
      // Fallback to regular search if lucky search fails
      const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQueries[0])}`;
      window.open(fallbackUrl, '_blank');
    }
  };

  // Render confidence badge
  const renderConfidenceBadge = (confidence: string | number) => {
    const colors = {
      'very-high': 'bg-green-100 text-green-800',
      'high': 'bg-blue-100 text-blue-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-orange-100 text-orange-800',
      'very-low': 'bg-red-100 text-red-800'
    };

    // Convert confidence to string and handle different formats
    let confidenceStr = String(confidence);
    let displayText = confidenceStr;

    // If it's a number (0-1), convert to descriptive text
    if (typeof confidence === 'number') {
      if (confidence >= 0.9) confidenceStr = 'very-high';
      else if (confidence >= 0.7) confidenceStr = 'high';
      else if (confidence >= 0.5) confidenceStr = 'medium';
      else if (confidence >= 0.3) confidenceStr = 'low';
      else confidenceStr = 'very-low';
      
      displayText = `${Math.round(confidence * 100)}%`;
    } else {
      // Handle string format
      displayText = confidenceStr.replace(/-/g, ' ');
    }

    return (
      <Badge className={cn("text-xs", colors[confidenceStr as keyof typeof colors])}>
        {displayText}
      </Badge>
    );
  };

  // Render suggested actions
  const renderSuggestedActions = (response: AgentResponse) => {
    if (!response.suggestedActions?.length) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {response.suggestedActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="xs"
            onClick={() => {
              if (action.action === 'search-recipes' && action.data) {
                onRecommendationSelect?.(action.data);
              } else if (action.action === 'new-query' && action.data?.query) {
                setQuery(action.data.query);
              }
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  };

  // Render recipe cards
  const renderRecipeCards = (response: AgentResponse) => {
    if (!response.data?.recipes?.length) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="text-xs font-medium text-gray-600 mb-2">🍳 Recipe Recommendations:</div>
        <div className="grid gap-3">
          {response.data.recipes.slice(0, 3).map((recipe, index) => (
            <Card key={recipe.id || index} className="overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer group" onClick={() => handleRecipeClick(recipe)}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Recipe Image */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg flex items-center justify-center">
                    {recipe.images && recipe.images.length > 0 ? (
                      <img 
                        src={recipe.images[0]} 
                        alt={recipe.name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <ChefHatIcon />
                    )}
                  </div>
                  
                  {/* Recipe Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 truncate group-hover:text-primary transition-colors leading-tight">
                        {recipe.name || recipe.title || 'Delicious Recipe'}
                      </h4>
                      {recipe.metadata?.isOnlineRecipe && (
                        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0 bg-blue-50 text-blue-600 border-blue-200">
                          Online Recipe
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {recipe.description || 'Delicious recipe ready to cook'}
                    </p>
                    
                    {/* Recipe Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon />
                        <span>{recipe.totalTime || recipe.cookTime || 30}min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UsersIcon />
                        <span>{recipe.servingsCount || 4}</span>
                      </div>
                      {recipe.difficulty && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {recipe.difficulty}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                  <Button 
                    size="xs" 
                    variant="default"
                    className="flex-1"
                    disabled={addingToMealPlan === recipe.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToMealPlan(recipe);
                    }}
                  >
                    {addingToMealPlan === recipe.id ? (
                      <>
                        <div className="w-3 h-3 mr-1 animate-spin border border-white border-t-transparent rounded-full" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-3 h-3 mr-1" />
                        Add to Meal Plan
                      </>
                    )}
                  </Button>
                  <div className="flex">
                    <Button 
                      size="xs" 
                      variant="outline"
                      className="rounded-r-none border-r-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRecipe(recipe);
                      }}
                    >
                      <ExternalLinkIcon className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      size="xs" 
                      variant="outline"
                      className="rounded-l-none px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Alternative: Open broader search if they want more options
                        const searchQuery = encodeURIComponent(`"${recipe.name}" recipe`);
                        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                      }}
                      title="Search for more versions of this recipe"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Render message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-3 p-4",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <BotIcon />
          </div>
        )}
        
        <div className={cn(
          "max-w-[85%] lg:max-w-[70%]",
          isUser ? "order-first" : ""
        )}>
          <div
            className={cn(
              "rounded-lg px-4 py-2 text-sm",
              isUser 
                ? "bg-primary text-primary-foreground ml-auto" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
            
            {message.response && (
              <div className="mt-2 space-y-2">
                {message.confidence && (
                  <div className="flex justify-between items-center">
                    {renderConfidenceBadge(message.confidence)}
                    <span className="text-xs opacity-70">
                      {message.response.metadata.processingTime}ms
                    </span>
                  </div>
                )}
                
                {renderSuggestedActions(message.response)}
                
                {renderRecipeCards(message.response)}
                
                {message.response.followUpSuggestions && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-600 mb-2">💭 You might also ask:</div>
                    <div className="space-y-1">
                      {message.response.followUpSuggestions.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          className="block w-full text-left p-2 bg-white bg-opacity-50 hover:bg-opacity-80 rounded border border-gray-200 hover:border-gray-300 transition-all duration-200 text-xs text-gray-700"
                          onClick={() => {
                            setQuery(suggestion);
                            // Auto-send the suggestion
                            setTimeout(() => {
                              sendQuery(suggestion);
                            }, 100);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={cn(
            "text-xs text-muted-foreground mt-1",
            isUser ? "text-right" : "text-left"
          )}>
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <UserIcon />
          </div>
        )}
      </div>
    );
  };

  console.log('Rendering NEW AgentInterface with welcome screen - v2.0');

  if (compact) {
    return (
      <div className={cn("w-full", className)}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            disabled={isProcessing}
          />
          {isVoiceSupported && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={startListening}
              disabled={isListening || isProcessing}
            >
              <MicIcon isListening={isListening} />
            </Button>
          )}
          <Button
            type="submit"
            disabled={!query.trim() || isProcessing}
            loading={isProcessing}
          >
            <SendIcon />
          </Button>
        </form>
        
        {error && (
          <Alert className="mt-2">
            {error}
            <Button variant="ghost" size="xs" onClick={clearError} className="ml-2">
              Dismiss
            </Button>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full h-full flex flex-col", className)}>
      <CardHeader padding="md">
        <Flex justify="between" align="center">
          <CardTitle className="flex items-center gap-2">
            <BotIcon />
            Sous Chef Assistant
            {state.status !== 'idle' && (
              <Badge variant="secondary" className="ml-2">
                {state.status}
              </Badge>
            )}
          </CardTitle>
          
          <Flex gap="sm">
            {showHistory && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullHistory(!showFullHistory)}
              >
                <HistoryIcon />
                {showFullHistory ? 'Hide' : 'Show'} History
              </Button>
            )}
            
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
              >
                <ClearIcon />
                Clear
              </Button>
            )}
          </Flex>
        </Flex>
        
        {error && (
          <Alert className="mt-2">
            {error}
            <Button variant="ghost" size="xs" onClick={clearError} className="ml-2">
              Dismiss
            </Button>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
                  <div className="text-center space-y-4 max-w-xs">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white mx-auto">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-lg text-gray-900">Hi! I'm your Sous Chef 👨‍🍳</div>
                      <div className="text-sm text-gray-600">I can help you with recipes, meal planning, ingredient management, and cooking tips!</div>
                    </div>
                  </div>
                </div>
                
                {/* Recommended Questions */}
                <div className="px-4 pb-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Try asking me:</div>
                  <div className="space-y-2">
                    {[
                      "What should I cook tonight?",
                      "I have chicken and rice, what can I make?",
                      "Plan my meals for this week",
                      "What ingredients are expiring soon?",
                      "Give me a healthy dinner recipe",
                      "Help me reduce food waste"
                    ].map((question, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(question);
                          // Auto-send the question
                          setTimeout(() => {
                            sendQuery(question);
                          }, 100);
                        }}
                        className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200 text-sm text-gray-700"
                      >
                        💡 {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {(showFullHistory ? messages : messages.slice(-6)).map(renderMessage)}
            
            {/* Typing indicator */}
            {isProcessing && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                  <BotIcon />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <Loading size="sm" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions - appears when there are messages but not processing */}
            {messages.length > 0 && !isProcessing && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: "🍳", text: "More recipes", query: "Give me more recipe ideas" },
                    { icon: "📋", text: "Meal plan", query: "Help me plan my meals" },
                    { icon: "🛒", text: "Shopping list", query: "Create a shopping list" },
                    { icon: "⏰", text: "Quick meals", query: "Show me quick 15-minute meals" }
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(action.query);
                        // Auto-send the action query
                        setTimeout(() => {
                          sendQuery(action.query);
                        }, 100);
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors duration-200"
                    >
                      <span>{action.icon}</span>
                      <span>{action.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </CardContent>

      <CardFooter padding="md" className="border-t bg-gray-50">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your message..."
                className="pr-12 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={isProcessing}
                autoComplete="off"
              />
              
              {isVoiceSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={startListening}
                  disabled={isListening || isProcessing}
                  className={cn(
                    "absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200",
                    isListening && "bg-red-100 text-red-600 hover:bg-red-200"
                  )}
                >
                  <MicIcon isListening={isListening} />
                </Button>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={!query.trim() || isProcessing}
              loading={isProcessing}
              className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 p-0"
            >
              {isProcessing ? (
                <Loading size="sm" className="text-white" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </div>
          
          {/* Input hint */}
          {!query && !isProcessing && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              Ask me about recipes, ingredients, meal planning, or cooking tips
            </div>
          )}
        </form>
      </CardFooter>
    </Card>
  );
};