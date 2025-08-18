'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MealSlot, MealType } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Flex,
  Grid,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Breadcrumbs,
  BreadcrumbItem,
} from '@/components/ui';

interface CalendarPickerProps {
  currentWeek: Date;
  meals: MealSlot[];
  onWeekSelect: (weekStart: Date) => void;
  onMonthSelect?: (month: Date) => void;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isCurrentWeek: boolean;
  mealCount: number;
  mealTypes: MealType[];
  hasPlannedMeals: boolean;
}

interface MonthViewProps {
  month: Date;
  meals: MealSlot[];
  currentWeek: Date;
  onDayClick: (date: Date) => void;
  onWeekClick: (weekStart: Date) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
};

const isSameWeek = (date1: Date, date2: Date): boolean => {
  const week1Start = getWeekStart(date1);
  const week2Start = getWeekStart(date2);
  return week1Start.getTime() === week2Start.getTime();
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

const getMealCountForDate = (date: Date, meals: MealSlot[]): { count: number; types: MealType[]; hasPlanned: boolean } => {
  const dayMeals = meals.filter(meal => isSameDay(meal.date, date));
  const plannedMeals = dayMeals.filter(meal => meal.recipe);
  
  return {
    count: dayMeals.length,
    types: dayMeals.map(meal => meal.mealType),
    hasPlanned: plannedMeals.length > 0,
  };
};

const MonthView: React.FC<MonthViewProps> = ({
  month,
  meals,
  currentWeek,
  onDayClick,
  onWeekClick,
}) => {
  const [hoveredWeek, setHoveredWeek] = useState<Date | null>(null);

  // Generate calendar days for the month
  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    
    // Get first day to display (previous month's days to fill first week)
    const firstDisplayDay = new Date(firstDay);
    firstDisplayDay.setDate(firstDay.getDate() - firstDay.getDay());
    
    // Get last day to display (next month's days to fill last week)
    const lastDisplayDay = new Date(lastDay);
    lastDisplayDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const currentDate = new Date(firstDisplayDay);
    const today = new Date();
    
    while (currentDate <= lastDisplayDay) {
      const isCurrentMonth = currentDate.getMonth() === monthIndex;
      const isToday = isSameDay(currentDate, today);
      const isSelected = isSameWeek(currentDate, currentWeek);
      const isCurrentWeek = isSameWeek(currentDate, currentWeek);
      
      const mealInfo = getMealCountForDate(currentDate, meals);
      
      days.push({
        date: new Date(currentDate),
        isCurrentMonth,
        isToday,
        isSelected,
        isCurrentWeek,
        mealCount: mealInfo.count,
        mealTypes: mealInfo.types,
        hasPlannedMeals: mealInfo.hasPlanned,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [month, meals, currentWeek]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const weekGroups: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];
    
    calendarDays.forEach((day, index) => {
      currentWeek.push(day);
      
      if ((index + 1) % 7 === 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weekGroups;
  }, [calendarDays]);

  const getMealTypeColor = (mealType: MealType): string => {
    const colors = {
      breakfast: 'bg-orange-100 text-orange-800',
      lunch: 'bg-green-100 text-green-800',
      dinner: 'bg-blue-100 text-blue-800',
      snack: 'bg-purple-100 text-purple-800',
    };
    return colors[mealType];
  };

  const getDayClassName = (day: CalendarDay): string => {
    let classes = 'relative p-2 text-center cursor-pointer transition-all duration-200 rounded-lg';
    
    if (!day.isCurrentMonth) {
      classes += ' text-gray-400';
    } else if (day.isToday) {
      classes += ' bg-primary-100 text-primary-800 font-semibold';
    } else if (day.isSelected) {
      classes += ' bg-primary-200 text-primary-900 font-semibold';
    } else if (day.hasPlannedMeals) {
      classes += ' bg-green-50 text-green-800 hover:bg-green-100';
    } else {
      classes += ' hover:bg-gray-100';
    }
    
    return classes;
  };

  return (
    <div className="space-y-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => {
          const weekStart = getWeekStart(week[0].date);
          const isHovered = hoveredWeek && isSameWeek(weekStart, hoveredWeek);
          const isCurrentWeek = isSameWeek(weekStart, currentWeek);
          
          return (
            <motion.div
              key={weekIndex}
              className={`grid grid-cols-7 gap-1 rounded-lg transition-all duration-200 ${
                isHovered ? 'bg-blue-50' : isCurrentWeek ? 'bg-primary-50' : ''
              }`}
              onMouseEnter={() => setHoveredWeek(weekStart)}
              onMouseLeave={() => setHoveredWeek(null)}
              onClick={() => onWeekClick(weekStart)}
            >
              {week.map((day, dayIndex) => (
                <motion.div
                  key={dayIndex}
                  className={getDayClassName(day)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDayClick(day.date);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-sm font-medium">{day.date.getDate()}</div>
                  
                  {/* Meal indicators */}
                  {day.mealCount > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {day.mealTypes.slice(0, 3).map((mealType, index) => (
                        <div
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full ${getMealTypeColor(mealType)}`}
                          title={`${mealType}: ${day.mealCount} meals`}
                        />
                      ))}
                      {day.mealCount > 3 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" title={`${day.mealCount} total meals`} />
                      )}
                    </div>
                  )}
                  
                  {/* Today indicator */}
                  {day.isToday && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  currentWeek,
  meals,
  onWeekSelect,
  onMonthSelect,
  className,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date(currentWeek));
  const [showMonthView, setShowMonthView] = useState(false);
  const [viewMode, setViewMode] = useState<'mini' | 'month'>('mini');

  // Navigation functions
  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setSelectedMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setSelectedMonth(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(today);
    onWeekSelect(getWeekStart(today));
  };

  // Generate breadcrumb navigation
  const breadcrumbs = useMemo(() => {
    const currentMonth = selectedMonth.getMonth();
    const currentYear = selectedMonth.getFullYear();
    const weekStart = getWeekStart(currentWeek);
    const weekEnd = getWeekEnd(currentWeek);
    
    return [
      { label: 'Calendar', href: '#' },
      { label: `${MONTHS[currentMonth]} ${currentYear}`, href: '#' },
      { 
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
        href: '#' 
      },
    ];
  }, [selectedMonth, currentWeek]);

  // Handle day click
  const handleDayClick = (date: Date) => {
    const weekStart = getWeekStart(date);
    onWeekSelect(weekStart);
    if (viewMode === 'mini') {
      setShowMonthView(false);
    }
  };

  // Handle week click
  const handleWeekClick = (weekStart: Date) => {
    onWeekSelect(weekStart);
    if (viewMode === 'mini') {
      setShowMonthView(false);
    }
  };

  // Mini calendar view
  const MiniCalendar = () => (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <Flex align="center" justify="between">
          <CardTitle className="text-lg">
            {MONTHS[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMonthView(true)}
          >
            📅
          </Button>
        </Flex>
      </CardHeader>
      <CardContent>
        <MonthView
          month={selectedMonth}
          meals={meals}
          currentWeek={currentWeek}
          onDayClick={handleDayClick}
          onWeekClick={handleWeekClick}
        />
      </CardContent>
    </Card>
  );

  // Full month view
  const FullMonthView = () => (
    <Modal isOpen={showMonthView} onClose={() => setShowMonthView(false)} size="lg">
      <ModalHeader>
        <ModalTitle>Calendar Navigation</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {/* Navigation controls */}
          <Flex align="center" justify="between">
            <Button
              variant="outline"
              onClick={goToPreviousMonth}
            >
              ← Previous
            </Button>
            <div className="text-center">
              <h3 className="text-xl font-semibold">
                {MONTHS[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="mt-2"
              >
                Go to Today
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={goToNextMonth}
            >
              Next →
            </Button>
          </Flex>

          {/* Breadcrumb navigation */}
          <Breadcrumbs>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={index} href={crumb.href}>
                {crumb.label}
              </BreadcrumbItem>
            ))}
          </Breadcrumbs>

          {/* Month calendar */}
          <MonthView
            month={selectedMonth}
            meals={meals}
            currentWeek={currentWeek}
            onDayClick={handleDayClick}
            onWeekClick={handleWeekClick}
          />

          {/* Legend */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Legend</h4>
            <Grid cols={2} className="gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary-200 rounded"></div>
                  <span className="text-sm">Current Week</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-50 rounded"></div>
                  <span className="text-sm">Planned Meals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary-100 rounded"></div>
                  <span className="text-sm">Today</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm">Breakfast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Lunch</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">Dinner</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm">Snack</span>
                </div>
              </div>
            </Grid>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => setShowMonthView(false)}
          className="w-full"
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {viewMode === 'mini' ? (
          <motion.div
            key="mini"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <MiniCalendar />
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <FullMonthView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
