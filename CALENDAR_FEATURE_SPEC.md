# Gold List Method Calendar Feature Specification

## 🎯 **Feature Overview**

A visual calendar interface that shows users their daily learning tasks based on Gold List Method progression, combining word addition and review cycles across all user notebooks.

### **User Experience Vision**

```
October 2024

Day 1:  📝 Add Words: French, Spanish
Day 2:  📝 Add Words: French, Spanish  
Day 3:  📝 Add Words: French, Spanish
...
Day 14: 📝 Add Words: French, Spanish
Day 15: 📝 Add Words: French, Spanish
        🔄 Review: French (Day 1 words), Spanish (Day 1 words)
Day 16: 📝 Add Words: French, Spanish
        🔄 Review: French (Day 2 words), Spanish (Day 2 words)
Day 17: 📝 Add Words: French, Spanish
        🔄 Review: French (Day 3 words), Spanish (Day 3 words)
Day 29: 📝 Add Words: French, Spanish  
        🔄 Review: French (Day 15 words), Spanish (Day 15 words)
        🔄 Round 2 Review: French (Day 1 words), Spanish (Day 1 words)
```

### **Visual States**
- **✅ Green Days**: Tasks completed successfully
- **❌ Gray Days**: Missed word addition (streak break)
- **🔒 Future Days**: Upcoming tasks preview
- **📅 Today**: Highlighted with active tasks
- **🎯 Overdue**: Reviews available but not completed

## 📊 **Implementation Complexity Assessment**

**Complexity Level**: Moderate to High  
**Recommended Timeline**: V2 Feature (2-3 weeks development)  
**Priority**: Nice-to-have enhancement for user engagement

### **Why Moderately Complex**
1. **Historical Data Calculation**: Retroactively determine what users should have done on past days
2. **Multiple Notebook Coordination**: Different notebooks may start on different dates
3. **Gold List Method Logic**: Respect 14-day intervals and round progression
4. **Real-time Updates**: Calendar must update as users complete tasks
5. **Performance Optimization**: Efficient queries for 30-90 days of data

## 🏗️ **Technical Architecture**

### **Database Schema Extensions**

#### **New Functions Required**
```sql
-- Get comprehensive calendar data for date range
get_user_calendar_data(
  user_id UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  date DATE,
  add_word_tasks JSONB,     -- Array of notebook tasks
  review_tasks JSONB,      -- Array of review tasks
  completion_status JSONB  -- Task completion tracking
);

-- Check daily task completion status
check_daily_task_completion(
  user_id UUID,
  target_date DATE,
  task_type TEXT           -- 'add_words' | 'review'
) RETURNS BOOLEAN;

-- Get review schedule for all user notebooks
get_user_review_schedule(
  user_id UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  review_date DATE,
  notebook_id UUID,
  original_add_date DATE,
  word_count INTEGER,
  round_number INTEGER
);
```

#### **Potential New Tables**
```sql
-- Optional: Cache calendar calculations for performance
CREATE TABLE user_calendar_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calendar_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Optional: Track task completion for gamification
CREATE TABLE daily_task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  task_type TEXT NOT NULL, -- 'add_words' | 'review'
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, task_type, notebook_id)
);
```

### **React Component Architecture**

#### **New Components**
```typescript
// Main calendar screen
CalendarScreen.tsx
├── CalendarHeader.tsx        // Month navigation, user stats
├── CalendarGrid.tsx          // Month view layout
│   └── CalendarDayCard.tsx   // Individual day component
├── CalendarLegend.tsx        // Explanation of colors/symbols
└── TaskDetailModal.tsx       // Expanded view of day's tasks

// Supporting components
TaskStatusIndicator.tsx       // Visual task completion states
NotebookTaskItem.tsx         // Individual notebook task display
ReviewTaskItem.tsx           // Individual review task display
CalendarNavigation.tsx       // Month/week switching
StreakVisualization.tsx      // Streak indicators on calendar
```

#### **Data Types**
```typescript
interface CalendarDay {
  date: string                // ISO date string
  addWordTasks: NotebookTask[]
  reviewTasks: ReviewTask[]
  isCompleted: boolean        // All tasks for day completed
  streakStatus: 'active' | 'broken' | 'future' | 'rest_day'
  isToday: boolean
  isPast: boolean
}

interface NotebookTask {
  notebookId: string
  notebookName: string
  language: string
  targetLanguage: string
  isCompleted: boolean
  wordsTargetCount: number    // User's daily goal for this notebook
  wordsActualCount: number    // Actually added
}

interface ReviewTask {
  notebookId: string
  notebookName: string
  language: string
  wordsCount: number
  originalAddDate: string     // When these words were first added
  roundNumber: number         // 1, 2, 3, or 4
  isCompleted: boolean
  isOverdue: boolean          // Past due date
}

interface CalendarData {
  month: number
  year: number
  days: CalendarDay[]
  monthlyStats: {
    totalTasksCompleted: number
    totalTasksAvailable: number
    streakCount: number
    longestStreak: number
  }
}
```

### **Service Layer Integration**

#### **New SupabaseService Methods**
```typescript
// In lib/services/supabaseService.ts

async getCalendarData(
  userId: string, 
  month: number, 
  year: number,
  currentDate?: Date
): Promise<CalendarData>

async getCalendarDay(
  userId: string, 
  date: Date,
  currentDate?: Date  
): Promise<CalendarDay>

async markTaskCompleted(
  userId: string,
  date: Date,
  taskType: 'add_words' | 'review',
  notebookId: string
): Promise<boolean>

async getUpcomingTasks(
  userId: string,
  days: number,
  currentDate?: Date
): Promise<CalendarDay[]>
```

## 🎨 **User Experience Design**

### **Calendar Views**

#### **Monthly View (Primary)**
```
October 2024                     [◀ November ▶]

Mon  Tue  Wed  Thu  Fri  Sat  Sun
      1🎯   2✅   3❌   4✅   5✅   6🔒
 7🔒   8🔒   9🔒  10🔒  11🔒  12🔒  13🔒
14🔒  15🔒  16🔒  17🔒  18🔒  19🔒  20🔒
21🔒  22🔒  23🔒  24🔒  25🔒  26🔒  27🔒
28🔒  29🔒  30🔒  31🔒

Legend:
🎯 Today  ✅ Completed  ❌ Missed  🔒 Future/Locked
```

#### **Day Detail View**
```
October 15, 2024               [✅ Mark Complete]

📝 Add New Words
├── French Notebook        10/10 words ✅
├── Spanish Notebook        8/10 words 🟡
└── German Notebook        0/10 words ❌

🔄 Review Words  
├── French (Oct 1) - Round 1    25 words ✅
├── Spanish (Oct 1) - Round 1   18 words 🟡
└── German (Sep 15) - Round 2   12 words ❌

Daily Progress: 67% Complete
Current Streak: 12 days
```

### **Visual Design Elements**

#### **Color Coding**
- **Green (#4CAF50)**: Completed tasks
- **Red (#F44336)**: Missed/overdue tasks  
- **Orange (#FF9800)**: Partially completed
- **Blue (#2196F3)**: Today's active tasks
- **Gray (#9E9E9E)**: Future/locked days
- **Purple (#9C27B0)**: Premium-only features

#### **Icons & Symbols**
- 📝 Add words task
- 🔄 Review task  
- ✅ Completed
- ❌ Missed
- 🟡 Partial
- 🔒 Locked (post-trial users)
- 🎯 Today
- 🔥 Streak indicator

### **Interaction Design**

#### **Tap Interactions**
- **Day Card**: Open day detail modal
- **Add Words Task**: Navigate to input screen for that notebook
- **Review Task**: Navigate to review screen for those words
- **Month Navigation**: Switch between months
- **Legend**: Show help overlay

#### **Gestures** 
- **Swipe Left/Right**: Navigate between months
- **Long Press Day**: Quick actions menu
- **Pull to Refresh**: Update calendar data

## 🔒 **Subscription Integration**

### **Free/Post-Trial Users**
- **View**: Can see calendar in read-only mode
- **Restrictions**: 
  - Cannot tap to add words (shows upgrade prompt)
  - Can only access review for existing words
  - Calendar shows "locked" state for most features
- **Motivation**: See all the learning they're missing

### **Trial Users**  
- **Full Access**: Complete calendar functionality
- **Limitations**: Single notebook restriction still applies
- **Encouragement**: Show potential with multiple notebooks

### **Premium Users**
- **Complete Access**: All calendar features
- **Enhanced Features**: 
  - Calendar export functionality
  - Advanced analytics integration
  - Custom goal setting per notebook

## ⚡ **Performance Considerations**

### **Optimization Strategies**

#### **Data Caching**
```typescript
// Cache calendar data for frequently accessed months
const CalendarCache = new Map<string, CalendarData>()

// Cache key: `${userId}-${year}-${month}`
const getCacheKey = (userId: string, year: number, month: number) => 
  `${userId}-${year}-${month}`
```

#### **Lazy Loading**
- Load current month on initial render
- Preload adjacent months on user interaction
- Paginate historical data beyond 3 months

#### **Database Optimization**
```sql
-- Indexes for calendar queries
CREATE INDEX idx_pages_user_date ON pages(user_id, date_created);
CREATE INDEX idx_words_page_created ON words(page_id, created_at);
CREATE INDEX idx_reviews_word_date ON reviews(word_id, reviewed_at);
```

## 📅 **Implementation Phases**

### **Phase 1: Backend Foundation (1 week)**
1. Create calendar calculation functions
2. Add task completion tracking
3. Database schema updates
4. API endpoint creation
5. DevTime integration for testing

### **Phase 2: Basic UI (1 week)**  
1. Monthly calendar grid
2. Basic day cards with task lists
3. Visual completion states
4. Navigation between months
5. Integration with existing screens

### **Phase 3: Enhanced UX (3-5 days)**
1. Day detail modal
2. Real-time updates
3. Subscription-aware features
4. Performance optimization
5. Loading states and error handling

### **Phase 4: Advanced Features (Optional)**
1. Calendar export functionality
2. Streak visualization enhancements
3. Progress predictions
4. Notification integration
5. Analytics dashboard integration

## 🎯 **Success Metrics**

### **User Engagement**
- Daily Active Users viewing calendar
- Task completion rate increase
- Session duration improvement
- Return user percentage

### **Business Metrics**
- Subscription conversion rate
- Feature adoption rate
- User retention improvement
- Support ticket reduction (clearer task visibility)

## 🚀 **Integration Points**

### **Existing App Integration**
- **DevTime Context**: Respect simulation mode for testing
- **Subscription Context**: Show/hide features based on tier
- **App Context**: Real-time updates when tasks completed
- **Theme Context**: Support dark/light mode
- **Notification Service**: Calendar-based reminder scheduling

### **Navigation Integration**
```typescript
// Add to app/(tabs)/_layout.tsx
<Stack.Screen 
  name="calendar" 
  options={{ 
    title: 'Learning Calendar',
    tabBarIcon: ({ color }) => <CalendarIcon color={color} />
  }} 
/>
```

## 💡 **Future Enhancements**

### **V2.1: Smart Scheduling**
- AI-suggested optimal learning times
- Adaptive difficulty based on performance
- Vacation/break mode planning

### **V2.2: Social Features**
- Share calendar achievements
- Study buddy synchronization
- Community challenges

### **V2.3: Analytics Integration**
- Predictive progress modeling
- Learning pattern analysis
- Personalized recommendations

## 📝 **Implementation Notes**

### **Key Considerations**
1. **DevTime Integration**: Ensure calendar works correctly with time simulation
2. **Performance**: Calendar queries can be expensive - optimize early
3. **UX Balance**: Show enough detail without overwhelming users
4. **Subscription Strategy**: Use calendar as conversion driver
5. **Accessibility**: Ensure calendar is screen reader friendly

### **Technical Debt Prevention**
- Abstract calendar calculations into reusable service
- Use TypeScript strictly for all calendar types  
- Write comprehensive tests for date calculations
- Document Gold List Method business logic clearly
- Plan for timezone handling from the start

---

**Status**: Specification Complete  
**Next Step**: Prioritize in product roadmap  
**Estimated Timeline**: 2-3 weeks full implementation  
**Dependencies**: Core app stability, subscription system finalization