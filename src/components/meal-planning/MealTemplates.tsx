'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MealTemplate, TemplatePreview, MealSlot, MealType } from '@/types';
import { useMealTemplates } from '@/hooks/useMealTemplates';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Flex,
  Grid,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Badge,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Loading,
  Alert,
  AlertTitle,
  AlertDescription,
  Select,
  Checkbox,
} from '@/components/ui';

interface MealTemplatesProps {
  onApplyTemplate: (meals: MealSlot[]) => Promise<void>;
  onSaveAsTemplate: (name: string, description: string, meals: MealSlot[]) => Promise<void>;
  currentMeals: MealSlot[];
  className?: string;
}

interface TemplateCardProps {
  template: MealTemplate;
  preview: TemplatePreview;
  onApply: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
  isLoading?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  preview,
  onApply,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
  isLoading = false,
}) => {
  const [showActions, setShowActions] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pre-built': return '🏗️';
      case 'user-created': return '👤';
      case 'shared': return '🔗';
      default: return '📋';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className="relative group"
    >
      <Card className="h-full shadow-md hover:shadow-lg transition-all duration-200 border-2 hover:border-primary-200">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getCategoryIcon(template.category)}</span>
                <CardTitle className="text-lg font-semibold truncate">
                  {template.name}
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {template.description}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge 
                variant="outline" 
                className={`text-xs ${getDifficultyColor(template.difficulty)}`}
              >
                {template.difficulty}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <Grid cols={2} className="gap-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Recipes</p>
              <p className="text-lg font-bold text-primary-600">
                {preview.totalRecipes}
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Prep Time</p>
              <p className="text-lg font-bold text-primary-600">
                {Math.round(preview.avgPrepTime)}m
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Cost</p>
              <p className="text-lg font-bold text-primary-600">
                ${template.estimatedCost}
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Unique</p>
              <p className="text-lg font-bold text-primary-600">
                {preview.uniqueRecipes}
              </p>
            </div>
          </Grid>

          {/* Meal Type Distribution */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Meal Distribution</p>
            <div className="flex gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(mealType => (
                <div key={mealType} className="flex-1 text-center">
                  <div className="text-xs text-gray-600 capitalize">{mealType}</div>
                  <div className="text-sm font-bold text-primary-600">
                    {preview.mealsByType[mealType] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onApply}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? <Loading className="w-4 h-4" /> : 'Apply'}
            </Button>
            
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="px-3"
              >
                ⋯
              </Button>
              
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]"
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onEdit();
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          onDuplicate();
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        📋 Duplicate
                      </button>
                      <button
                        onClick={() => {
                          onShare();
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        🔗 Share
                      </button>
                      {template.category === 'user-created' && (
                        <button
                          onClick={() => {
                            onDelete();
                            setShowActions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const MealTemplates: React.FC<MealTemplatesProps> = ({
  onApplyTemplate,
  onSaveAsTemplate,
  currentMeals,
  className,
}) => {
  const {
    templates,
    isLoading,
    error,
    getTemplatePreview,
    applyTemplate,
    duplicateTemplate,
    generateShareLink,
    deleteTemplate,
    getTemplatesByCategory,
    searchTemplates,
  } = useMealTemplates();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MealTemplate | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state for save/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [] as string[],
  });

  // Filter templates based on active tab and search
  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    
    if (activeTab !== 'all') {
      filtered = getTemplatesByCategory(activeTab as any);
    }
    
    if (searchQuery.trim()) {
      filtered = searchTemplates(searchQuery);
    }
    
    return filtered;
  }, [templates, activeTab, searchQuery, getTemplatesByCategory, searchTemplates]);

  // Handle template application
  const handleApplyTemplate = async (templateId: string) => {
    setActionLoading(templateId);
    try {
      const meals = await applyTemplate(templateId, new Date());
      await onApplyTemplate(meals);
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle save as template
  const handleSaveAsTemplate = async () => {
    if (!formData.name.trim()) return;
    
    try {
      await onSaveAsTemplate(formData.name, formData.description, currentMeals);
      setShowSaveModal(false);
      setFormData({ name: '', description: '', tags: [] });
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  // Handle template duplication
  const handleDuplicateTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      tags: [...template.tags, 'duplicate'],
    });
    setShowEditModal(true);
  };

  // Handle template sharing
  const handleShareTemplate = async (templateId: string) => {
    try {
      const link = await generateShareLink(templateId);
      setShareLink(link);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        await deleteTemplate(templateId);
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  if (error) {
    return (
      <Alert variant="error">
        <AlertTitle>Error Loading Templates</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      <Card className="shadow-lg">
        <CardHeader>
          <Flex align="center" justify="between" className="flex-col sm:flex-row gap-4">
            <div>
              <CardTitle className="text-2xl">Meal Templates</CardTitle>
              <p className="text-gray-600 mt-1">
                Save time with pre-built and custom meal templates
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowSaveModal(true)}
              disabled={currentMeals.filter(m => m.recipe).length === 0}
            >
              💾 Save Current Week as Template
            </Button>
          </Flex>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Templates</TabsTrigger>
                <TabsTrigger value="pre-built">Pre-built</TabsTrigger>
                <TabsTrigger value="user-created">My Templates</TabsTrigger>
                <TabsTrigger value="shared">Shared</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loading className="w-8 h-8" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No templates found
              </h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first template to get started'}
              </p>
            </div>
          ) : (
            <Grid cols={1} responsive={{ md: 2, lg: 3 }} className="gap-6">
              <AnimatePresence>
                {filteredTemplates.map(template => {
                  const preview = getTemplatePreview(template.id);
                  if (!preview) return null;

                  return (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      preview={preview}
                      onApply={() => handleApplyTemplate(template.id)}
                      onEdit={() => {
                        setSelectedTemplate(template);
                        setFormData({
                          name: template.name,
                          description: template.description,
                          tags: template.tags,
                        });
                        setShowEditModal(true);
                      }}
                      onDuplicate={() => handleDuplicateTemplate(template.id)}
                      onShare={() => handleShareTemplate(template.id)}
                      onDelete={() => handleDeleteTemplate(template.id)}
                      isLoading={actionLoading === template.id}
                    />
                  );
                })}
              </AnimatePresence>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Save Template Modal */}
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)}>
        <ModalHeader>
          <ModalTitle>Save Current Week as Template</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Weekly Rotation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this template..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <Input
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }))}
                placeholder="quick, healthy, family (comma separated)"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Flex className="gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowSaveModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAsTemplate}
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              Save Template
            </Button>
          </Flex>
        </ModalFooter>
      </Modal>

      {/* Share Template Modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)}>
        <ModalHeader>
          <ModalTitle>Share Template</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-gray-600">
              Share this template with others using the link below:
            </p>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(shareLink)}
              >
                Copy
              </Button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => setShowShareModal(false)}
            className="w-full"
          >
            Done
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
