import React from 'react';
import { Ingredient } from '@/types';
import { Badge, Button } from '@/components/ui';
import { 
  formatDate, 
  getDaysUntilExpiration, 
  getExpirationStatus, 
  getExpirationBadgeVariant,
  capitalizeFirst 
} from '@/utils';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

export const IngredientCard: React.FC<IngredientCardProps> = React.memo(({
  ingredient,
  onEdit,
  onDelete,
}) => {
  const expirationStatus = getExpirationStatus(ingredient.expirationDate);
  const daysUntilExpiration = ingredient.expirationDate 
    ? getDaysUntilExpiration(ingredient.expirationDate)
    : null;

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'fridge':
        return '🧊';
      case 'freezer':
        return '❄️';
      case 'pantry':
        return '🏠';
      default:
        return '📦';
    }
  };

  const getExpirationText = () => {
    if (!ingredient.expirationDate) return null;
    
    if (daysUntilExpiration !== null) {
      if (daysUntilExpiration < 0) {
        return `Expired ${Math.abs(daysUntilExpiration)} day${Math.abs(daysUntilExpiration) !== 1 ? 's' : ''} ago`;
      } else if (daysUntilExpiration === 0) {
        return 'Expires today';
      } else if (daysUntilExpiration <= 3) {
        return `Expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`;
      } else {
        return `Expires ${formatDate(ingredient.expirationDate)}`;
      }
    }
    return formatDate(ingredient.expirationDate);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">
            {ingredient.customName || ingredient.name}
          </h3>
          {ingredient.customName && (
            <p className="text-sm text-gray-500">{ingredient.name}</p>
          )}
        </div>
        
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(ingredient)}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(ingredient.id)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Quantity and Location */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium text-gray-900">
            {ingredient.quantity} {ingredient.unit}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getLocationIcon(ingredient.location)}</span>
          <span className="text-sm text-gray-600 capitalize">
            {ingredient.location}
          </span>
        </div>
      </div>

      {/* Category */}
      <div className="mb-3">
        <Badge variant="secondary" size="sm">
          {capitalizeFirst(ingredient.category)}
        </Badge>
      </div>

      {/* Expiration Info */}
      {ingredient.expirationDate && (
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <Badge 
              variant={getExpirationBadgeVariant(expirationStatus)}
              size="sm"
            >
              {capitalizeFirst(expirationStatus.replace('-', ' '))}
            </Badge>
            <span className="text-sm text-gray-600">
              {getExpirationText()}
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {ingredient.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {ingredient.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
            {ingredient.tags.length > 3 && (
              <Badge variant="default" size="sm">
                +{ingredient.tags.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {ingredient.notes && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 italic">
            "{ingredient.notes}"
          </p>
        </div>
      )}

      {/* Purchase Date */}
      <div className="text-xs text-gray-400 border-t pt-2">
        Bought: {formatDate(ingredient.dateBought)}
      </div>
    </div>
  );
});