import React from 'react';
import { Ingredient } from '@/types';
import { Badge, Button } from '@/components/ui';
import { 
  formatDate, 
  getDaysUntilExpiration, 
  getExpirationStatus, 
  getExpirationBadgeVariant 
} from '@/utils';

interface ExpirationTrackerProps {
  ingredients: Ingredient[];
  onViewIngredient?: (ingredient: Ingredient) => void;
  className?: string;
}

interface ExpirationGroup {
  status: 'expired' | 'expiring-soon' | 'fresh';
  title: string;
  ingredients: Ingredient[];
  color: string;
  icon: string;
}

export const ExpirationTracker: React.FC<ExpirationTrackerProps> = ({
  ingredients,
  onViewIngredient,
  className,
}) => {
  // Group ingredients by expiration status
  const expirationGroups: ExpirationGroup[] = [
    {
      status: 'expired',
      title: 'Expired Items',
      ingredients: ingredients.filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'expired';
      }),
      color: 'text-red-600',
      icon: '🚨',
    },
    {
      status: 'expiring-soon',
      title: 'Expiring Soon (3 days or less)',
      ingredients: ingredients.filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'expiring-soon';
      }),
      color: 'text-yellow-600',
      icon: '⚠️',
    },
    {
      status: 'fresh',
      title: 'Fresh Items',
      ingredients: ingredients.filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'fresh' && ingredient.expirationDate; // Only show items with expiration dates
      }).slice(0, 5), // Show only first 5 fresh items
      color: 'text-green-600',
      icon: '✅',
    },
  ];

  const totalExpired = expirationGroups[0].ingredients.length;
  const totalExpiringSoon = expirationGroups[1].ingredients.length;
  const totalWithExpirationDates = ingredients.filter(i => i.expirationDate).length;

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Expiration Tracker</h3>
          <div className="flex space-x-2">
            {totalExpired > 0 && (
              <Badge variant="danger" size="sm">
                {totalExpired} expired
              </Badge>
            )}
            {totalExpiringSoon > 0 && (
              <Badge variant="warning" size="sm">
                {totalExpiringSoon} expiring soon
              </Badge>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🚨</span>
              <div>
                <p className="text-red-600 font-semibold">{totalExpired}</p>
                <p className="text-red-700 text-sm">Expired Items</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <p className="text-yellow-600 font-semibold">{totalExpiringSoon}</p>
                <p className="text-yellow-700 text-sm">Expiring Soon</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📊</span>
              <div>
                <p className="text-green-600 font-semibold">{totalWithExpirationDates}</p>
                <p className="text-green-700 text-sm">Items Tracked</p>
              </div>
            </div>
          </div>
        </div>

        {/* No items message */}
        {totalExpired === 0 && totalExpiringSoon === 0 && totalWithExpirationDates === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">📅</div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">No expiration tracking yet</h4>
            <p className="text-gray-500">
              Add expiration dates to your ingredients to start tracking them here.
            </p>
          </div>
        )}

        {/* Expiration Groups */}
        {expirationGroups.map((group) => {
          if (group.ingredients.length === 0) return null;

          return (
            <div key={group.status} className="mb-6 last:mb-0">
              <div className="flex items-center mb-3">
                <span className="text-xl mr-2">{group.icon}</span>
                <h4 className={`font-medium ${group.color}`}>
                  {group.title} ({group.ingredients.length})
                </h4>
              </div>
              
              <div className="space-y-2">
                {group.ingredients.map((ingredient) => {
                  const daysUntilExpiration = ingredient.expirationDate 
                    ? getDaysUntilExpiration(ingredient.expirationDate)
                    : null;

                  return (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {ingredient.customName || ingredient.name}
                          </span>
                          <Badge
                            variant={getExpirationBadgeVariant(group.status)}
                            size="sm"
                          >
                            {group.status === 'expired' && daysUntilExpiration !== null
                              ? `${Math.abs(daysUntilExpiration)} days ago`
                              : group.status === 'expiring-soon' && daysUntilExpiration !== null
                              ? `${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''} left`
                              : group.status === 'fresh' && ingredient.expirationDate
                              ? formatDate(ingredient.expirationDate)
                              : group.status
                            }
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <span>{ingredient.quantity} {ingredient.unit}</span>
                          <span className="mx-2">•</span>
                          <span className="capitalize">{ingredient.location}</span>
                          {ingredient.expirationDate && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Expires: {formatDate(ingredient.expirationDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {onViewIngredient && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewIngredient(ingredient)}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Tips */}
        {(totalExpired > 0 || totalExpiringSoon > 0) && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {totalExpired > 0 && (
                <li>• Consider composting or properly disposing of expired items</li>
              )}
              {totalExpiringSoon > 0 && (
                <li>• Use expiring items first in your next meal</li>
              )}
              <li>• Check your ingredients regularly to minimize waste</li>
              <li>• Store items properly to extend their freshness</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};