import React, { useState, useMemo } from 'react';
import { Ingredient } from '@/types';
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalBody, 
  ModalFooter,
  Input, 
  Button, 
  Card, 
  CardContent,
  Badge,
  List,
  ListItem
} from '@/components/ui';

interface RecipeIngredientSelectorProps {
  ingredients: Ingredient[];
  onSelect: (ingredient: Ingredient) => void;
  onClose: () => void;
}

export const RecipeIngredientSelector: React.FC<RecipeIngredientSelectorProps> = ({
  ingredients,
  onSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories from ingredients
  const categories = useMemo(() => {
    const cats = new Set(ingredients.map(ing => ing.category));
    return ['all', ...Array.from(cats)];
  }, [ingredients]);

  // Filter ingredients based on search and category
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ingredient => {
      const matchesSearch = !searchTerm || 
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ingredient.customName && ingredient.customName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || ingredient.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [ingredients, searchTerm, selectedCategory]);

  const handleSelect = (ingredient: Ingredient) => {
    onSelect(ingredient);
  };

  const formatIngredientDisplay = (ingredient: Ingredient) => {
    const displayName = ingredient.customName || ingredient.name;
    const quantity = `${ingredient.quantity} ${ingredient.unit}`;
    return { displayName, quantity };
  };

  const getExpirationStatus = (expirationDate?: Date) => {
    if (!expirationDate) return 'no-expiry';
    
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return 'expired';
    if (diffDays <= 3) return 'expiring-soon';
    return 'fresh';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fresh': return 'text-green-600';
      case 'expiring-soon': return 'text-yellow-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'fresh': return 'Fresh';
      case 'expiring-soon': return 'Expiring Soon';
      case 'expired': return 'Expired';
      default: return 'No Expiry';
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Select Ingredient from Your Pantry</ModalTitle>
      </ModalHeader>
      
      <ModalBody>
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <Input
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredIngredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {ingredients.length === 0 
                  ? "You don't have any ingredients in your pantry yet." 
                  : "No ingredients match your search criteria."
                }
              </div>
            ) : (
              <div className="space-y-2">
                {filteredIngredients.map((ingredient) => {
                  const { displayName, quantity } = formatIngredientDisplay(ingredient);
                  const status = getExpirationStatus(ingredient.expirationDate);
                  
                  return (
                    <Card 
                      key={ingredient.id} 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelect(ingredient)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{displayName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-600">{quantity}</span>
                              <Badge variant="outline" size="sm">
                                {ingredient.category}
                              </Badge>
                              <span className={`text-xs ${getStatusColor(status)}`}>
                                {getStatusText(status)}
                              </span>
                            </div>
                            
                            {ingredient.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ingredient.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="secondary" size="sm">
                                    {tag}
                                  </Badge>
                                ))}
                                {ingredient.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{ingredient.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {ingredient.expirationDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Expires: {new Date(ingredient.expirationDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <Badge variant="outline" size="sm">
                              {ingredient.location}
                            </Badge>
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(ingredient);
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Selecting an ingredient from your pantry will automatically 
              fill in the name and suggested unit. You can still modify the amount and other details.
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};