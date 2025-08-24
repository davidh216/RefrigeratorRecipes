'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Flex,
  Grid,
  Badge,
  Button,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  Loading
} from '@/components/ui';
import { useAgent, useAgentAnalytics } from '@/hooks/useAgent';
import { useAuth } from '@/contexts/AuthContext';

// Icons
const TrendingUpIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BrainIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364 4.5 4.5 0 00-6.364 0L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ChefHatIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4a2 2 0 00-4 0v2M8 6V4a2 2 0 00-4 0v2M4 10h16l-1 10H5L4 10z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export interface AgentInsightsProps {
  className?: string;
  showUserPreferences?: boolean;
  showCookingPatterns?: boolean;
  showPersonalization?: boolean;
  showPerformance?: boolean;
  timeRange?: number; // days
  agentType?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  description
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardContent padding="md">
        <Flex justify="between" align="start" className="mb-2">
          <div className="text-muted-foreground">{icon}</div>
          {change && (
            <Badge variant="ghost" className={cn("text-xs", getTrendColor())}>
              {change}
            </Badge>
          )}
        </Flex>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AgentInsights: React.FC<AgentInsightsProps> = ({
  className,
  showUserPreferences = true,
  showCookingPatterns = true,
  showPersonalization = true,
  showPerformance = true,
  timeRange = 30,
  agentType = 'sous-chef'
}) => {
  const { state, preferences, history } = useAgent();
  const { metrics, loading: metricsLoading } = useAgentAnalytics(agentType);
  const { user, isDemoMode } = useAuth();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate insights from agent usage
  const insights = useMemo(() => {
    if (!history.length) return null;

    const recentHistory = history.slice(-selectedTimeRange);
    
    // Most common intents
    const intentCounts = recentHistory.reduce((acc, { request }) => {
      const intent = request.intent || 'general-help';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIntent = Object.entries(intentCounts).sort(([,a], [,b]) => b - a)[0];

    // Average confidence
    const avgConfidence = recentHistory.reduce((acc, { response }) => {
      const confidenceScore = {
        'very-high': 5,
        'high': 4,
        'medium': 3,
        'low': 2,
        'very-low': 1
      }[response.confidence] || 3;
      return acc + confidenceScore;
    }, 0) / recentHistory.length;

    // Success rate (high confidence responses)
    const highConfidenceCount = recentHistory.filter(({ response }) => 
      ['high', 'very-high'].includes(response.confidence)
    ).length;
    const successRate = (highConfidenceCount / recentHistory.length) * 100;

    // Average response time
    const avgResponseTime = recentHistory.reduce((acc, { response }) => 
      acc + response.metadata.processingTime, 0
    ) / recentHistory.length;

    // Most active time of day
    const hourCounts = recentHistory.reduce((acc, { request }) => {
      const hour = request.metadata.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return {
      totalQueries: recentHistory.length,
      topIntent: topIntent ? topIntent[0].replace('-', ' ') : 'N/A',
      avgConfidence: avgConfidence.toFixed(1),
      successRate: successRate.toFixed(1),
      avgResponseTime: Math.round(avgResponseTime),
      peakHour: peakHour ? `${peakHour}:00` : 'N/A',
      intentDistribution: intentCounts
    };
  }, [history, selectedTimeRange]);

  // User preferences insights
  const preferencesInsights = useMemo(() => {
    if (!preferences?.learnedPreferences) return null;

    const { 
      preferredRecipeTypes = [], 
      commonIngredients = [], 
      cookingPatterns = {},
      timePreferences = {}
    } = preferences.learnedPreferences;

    return {
      favoriteCategories: preferredRecipeTypes.slice(0, 5),
      frequentIngredients: commonIngredients.slice(0, 8),
      cookingFrequency: cookingPatterns.weeklyFrequency || 'Unknown',
      preferredCookingTime: timePreferences.preferredTime || 'Evening',
      complexityPreference: cookingPatterns.complexityPreference || 'Medium'
    };
  }, [preferences]);

  if (!user && !isDemoMode) {
    return (
      <Card className={className}>
        <CardContent padding="lg" className="text-center">
          <div className="text-muted-foreground">
            <UserIcon />
            <div className="mt-2">Sign in to view your cooking insights</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader padding="md">
          <Flex justify="between" align="center">
            <CardTitle className="flex items-center gap-2">
              <BrainIcon />
              Agent Insights
              {isDemoMode && (
                <Badge variant="secondary" className="ml-2">Demo</Badge>
              )}
            </CardTitle>
            
            <Select
              value={selectedTimeRange.toString()}
              onValueChange={(value) => setSelectedTimeRange(parseInt(value))}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </Select>
          </Flex>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {insights && (
            <Grid cols={{ base: 2, lg: 4 }} gap="md">
              <MetricCard
                title="Total Queries"
                value={insights.totalQueries}
                icon={<ChartBarIcon />}
                description={`In last ${selectedTimeRange} days`}
              />
              
              <MetricCard
                title="Success Rate"
                value={`${insights.successRate}%`}
                trend={parseFloat(insights.successRate) > 75 ? 'up' : 'neutral'}
                icon={<TrendingUpIcon />}
                description="High confidence responses"
              />
              
              <MetricCard
                title="Avg Response Time"
                value={`${insights.avgResponseTime}ms`}
                icon={<ClockIcon />}
                trend={insights.avgResponseTime < 1000 ? 'up' : 'neutral'}
                description="Agent processing speed"
              />
              
              <MetricCard
                title="Top Intent"
                value={insights.topIntent}
                icon={<ChefHatIcon />}
                description="Most requested type"
              />
            </Grid>
          )}

          {!insights && (
            <Card>
              <CardContent padding="lg" className="text-center">
                <div className="text-muted-foreground">
                  <ChartBarIcon />
                  <div className="mt-2">Start chatting with the agent to see insights</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          {state.metrics && (
            <Card>
              <CardHeader padding="md">
                <CardTitle>Session Statistics</CardTitle>
              </CardHeader>
              <CardContent padding="md">
                <Grid cols={{ base: 2, md: 4 }} gap="md">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {state.metrics.totalRequests}
                    </div>
                    <div className="text-sm text-muted-foreground">Requests</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {state.metrics.successfulResponses}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(state.metrics.averageProcessingTime)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {state.metrics.lastActivity.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Last Activity</div>
                  </div>
                </Grid>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          {showUserPreferences && preferencesInsights && (
            <>
              <Card>
                <CardHeader padding="md">
                  <CardTitle className="flex items-center gap-2">
                    <HeartIcon />
                    Your Cooking Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent padding="md">
                  <Grid cols={{ base: 1, md: 2 }} gap="lg">
                    <div>
                      <h4 className="font-medium mb-3">Favorite Categories</h4>
                      <div className="space-y-2">
                        {preferencesInsights.favoriteCategories.length > 0 ? (
                          preferencesInsights.favoriteCategories.map((category, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm">{category}</span>
                              <Progress 
                                value={(5 - index) * 20} 
                                className="w-16 h-2" 
                              />
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Keep using the agent to learn your preferences
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Frequent Ingredients</h4>
                      <Flex gap="xs" wrap>
                        {preferencesInsights.frequentIngredients.length > 0 ? (
                          preferencesInsights.frequentIngredients.map((ingredient, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {ingredient}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No frequent ingredients learned yet
                          </div>
                        )}
                      </Flex>
                    </div>
                  </Grid>
                </CardContent>
              </Card>

              <Card>
                <CardHeader padding="md">
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon />
                    Cooking Style
                  </CardTitle>
                </CardHeader>
                <CardContent padding="md">
                  <Grid cols={{ base: 1, sm: 3 }} gap="md">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">
                        {preferencesInsights.complexityPreference}
                      </div>
                      <div className="text-sm text-muted-foreground">Complexity</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {preferencesInsights.preferredCookingTime}
                      </div>
                      <div className="text-sm text-muted-foreground">Preferred Time</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {preferencesInsights.cookingFrequency}
                      </div>
                      <div className="text-sm text-muted-foreground">Frequency</div>
                    </div>
                  </Grid>
                </CardContent>
              </Card>
            </>
          )}

          {(!preferencesInsights || !showUserPreferences) && (
            <Card>
              <CardContent padding="lg" className="text-center">
                <div className="text-muted-foreground">
                  <UserIcon />
                  <div className="mt-2">Continue using the agent to build your preference profile</div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {showCookingPatterns && insights && (
            <>
              <Card>
                <CardHeader padding="md">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon />
                    Usage Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent padding="md">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Most Active Time</h4>
                      <div className="text-2xl font-bold text-primary">
                        {insights.peakHour}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        When you most often ask for cooking help
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Request Types</h4>
                      <div className="space-y-2">
                        {Object.entries(insights.intentDistribution)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([intent, count]) => (
                            <div key={intent} className="flex items-center justify-between">
                              <span className="text-sm capitalize">
                                {intent.replace('-', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(count / insights.totalQueries) * 100} 
                                  className="w-20 h-2" 
                                />
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {(!insights || !showCookingPatterns) && (
            <Card>
              <CardContent padding="lg" className="text-center">
                <div className="text-muted-foreground">
                  <ChartBarIcon />
                  <div className="mt-2">More data needed to show patterns</div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {showPerformance && (metricsLoading ? (
            <Card>
              <CardContent padding="lg" className="text-center">
                <Loading />
                <div className="mt-2 text-sm text-muted-foreground">
                  Loading performance metrics...
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader padding="md">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon />
                  Agent Performance
                </CardTitle>
              </CardHeader>
              <CardContent padding="md">
                {insights ? (
                  <div className="space-y-4">
                    <Grid cols={{ base: 1, sm: 2 }} gap="md">
                      <div>
                        <h4 className="font-medium mb-2">Response Quality</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Average Confidence</span>
                            <span className="font-medium">{insights.avgConfidence}/5.0</span>
                          </div>
                          <Progress 
                            value={(parseFloat(insights.avgConfidence) / 5) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Response Speed</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Average Time</span>
                            <span className="font-medium">{insights.avgResponseTime}ms</span>
                          </div>
                          <Progress 
                            value={Math.max(0, 100 - (insights.avgResponseTime / 20))} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </Grid>

                    <div>
                      <h4 className="font-medium mb-2">Success Metrics</h4>
                      <div className="text-3xl font-bold text-green-600">
                        {insights.successRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Of responses were high confidence
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ClockIcon />
                    <div className="mt-2">No performance data available</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};