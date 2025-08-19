import React, { useState } from 'react';
import { Ingredient } from '@/types';
import { Badge, Button, Checkbox } from '@/components/ui';
import { 
  getDaysUntilExpiration, 
  getExpirationStatus, 
  getExpirationBadgeVariant 
} from '@/utils';

interface ExpirationTrackerProps {
  ingredients: Ingredient[];
  onViewIngredient?: (ingredient: Ingredient) => void;
  onRemoveIngredients?: (ingredientIds: string[]) => void;
  className?: string;
}

interface ExpirationGroup {
  status: 'expired' | 'expiring-soon' | 'fresh';
  title: string;
  ingredients: Ingredient[];
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const ExpirationTracker: React.FC<ExpirationTrackerProps> = ({
  ingredients,
  onViewIngredient,
  onRemoveIngredients,
  className = '',
}) => {
  const [selectedExpiredItems, setSelectedExpiredItems] = useState<Set<string>>(new Set());
  const [visibleRows, setVisibleRows] = useState<Record<string, number>>({
    expired: 5,
    'expiring-soon': 5,
    fresh: 5,
  });

  // Group ingredients by expiration status
  const expirationGroups: ExpirationGroup[] = [
    {
      status: 'expired',
      title: 'Expired',
      ingredients: ingredients.filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'expired';
      }),
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '🚨',
    },
    {
      status: 'expiring-soon',
      title: 'Expiring Soon',
      ingredients: ingredients.filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'expiring-soon';
      }),
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '⚠️',
    },
    {
      status: 'fresh',
      title: 'Fresh',
      ingredients: ingredients.filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'fresh' && ingredient.expirationDate;
      }),
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '✅',
    },
  ];

  const handleSelectExpiredItem = (ingredientId: string, checked: boolean) => {
    const newSelected = new Set(selectedExpiredItems);
    if (checked) {
      newSelected.add(ingredientId);
    } else {
      newSelected.delete(ingredientId);
    }
    setSelectedExpiredItems(newSelected);
  };



  const handleRemoveSelected = () => {
    if (selectedExpiredItems.size > 0 && onRemoveIngredients) {
      onRemoveIngredients(Array.from(selectedExpiredItems));
      setSelectedExpiredItems(new Set());
    }
  };

  const handleShowMore = (groupStatus: string) => {
    setVisibleRows(prev => ({
      ...prev,
      [groupStatus]: prev[groupStatus] + 5
    }));
  };


  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Full Height Column Layout */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {expirationGroups.map((group) => (
          <div
            key={group.status}
            className={`${group.bgColor} ${group.borderColor} border rounded-lg flex flex-col h-full`}
          >
            {/* Combined Header with KPI and Delete Button for Expired */}
            <div className="flex-shrink-0 p-6 border-b border-current border-opacity-20">
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <span className="text-3xl mr-3">{group.icon}</span>
                  <div>
                    <p className={`${group.color} font-bold text-2xl`}>
                      {group.ingredients.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h4 className={`font-semibold text-lg ${group.color}`}>
                    {group.title}
                  </h4>
                  {/* Show Delete button next to Expired header when items are selected */}
                  {group.status === 'expired' && selectedExpiredItems.size > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRemoveSelected}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 font-semibold shadow-md"
                    >
                      🗑️ Delete ({selectedExpiredItems.size})
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-3">
              {group.ingredients.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className={`text-gray-400 text-4xl mb-3`}>
                      {group.status === 'expired' ? '🎉' : group.status === 'expiring-soon' ? '👍' : '🌟'}
                    </div>
                    <p className="text-gray-500 text-sm">
                      {group.status === 'expired' ? 'No expired items!' : 
                       group.status === 'expiring-soon' ? 'Nothing expiring soon' : 
                       'No fresh items tracked'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {group.ingredients
                      .slice(0, visibleRows[group.status] * 2) // 2 columns per row
                      .map((ingredient) => {
                      const daysUntilExpiration = ingredient.expirationDate 
                        ? getDaysUntilExpiration(ingredient.expirationDate)
                        : null;
                      const isExpired = group.status === 'expired';
                      const isSelected = selectedExpiredItems.has(ingredient.id);

                      return (
                        <div
                          key={ingredient.id}
                          className={`bg-white rounded-lg p-2 shadow-sm border transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-red-500 bg-red-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            {isExpired && (
                              <Checkbox
                                checked={isSelected}
                                onChange={(checked) => handleSelectExpiredItem(ingredient.id, checked)}
                                className="mt-0 flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="font-medium text-gray-900 truncate text-xs">
                                  {ingredient.customName || ingredient.name}
                                </h5>
                                {onViewIngredient && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewIngredient(ingredient)}
                                    className="flex-shrink-0 p-0.5 h-5 w-5"
                                  >
                                    👁️
                                  </Button>
                                )}
                              </div>
                              
                              <div className="space-y-0.5">
                                <div className="text-xs text-gray-600">
                                  {ingredient.quantity} {ingredient.unit} • {ingredient.location}
                                </div>
                                
                                {daysUntilExpiration !== null && (
                                  <Badge
                                    variant={getExpirationBadgeVariant(group.status)}
                                    size="sm"
                                    className="text-xs px-1 py-0.5"
                                  >
                                    {group.status === 'expired'
                                      ? `${Math.abs(daysUntilExpiration)} days ago`
                                      : group.status === 'expiring-soon'
                                      ? `${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''} left`
                                      : `${daysUntilExpiration} days left`
                                    }
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show More Button */}
                  {group.ingredients.length > visibleRows[group.status] * 2 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowMore(group.status)}
                        className="text-xs px-3 py-1"
                      >
                        Show More ({group.ingredients.length - visibleRows[group.status] * 2} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {expirationGroups.every(group => group.ingredients.length === 0) && (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h4 className="text-xl font-medium text-gray-700 mb-2">No expiration tracking yet</h4>
            <p className="text-gray-500 max-w-md">
              Add expiration dates to your ingredients to start tracking them here and prevent food waste.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};