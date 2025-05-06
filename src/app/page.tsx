'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// ------------------Types---------------------

type Habit = {
  id: number;
  name: string;
  icon: string;
  category: 'health' | 'fitness' | 'mindfulness' | 'productivity' | 'personal' | 'social';
  target: number;
  unit: string;
  currentStreak: number;
  longestStreak: number;
  data: number[];
  color: string;
};

type ScreenTimeItem = {
  name: string;
  value: number;
  color: string;
};

type MoodDataItem = {
  day: string;
  value: number;
};

type Reminder = {
  id: number;
  habitId: number;
  habitName: string;
  habitIcon: string;
  time: string; // "HH:MM"
  message: string;
  isActive: boolean;
  createdAt: string;
};

// Constants and mock data
const weekdays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_HABITS: Habit[] = [
  {
    id: 1,
    name: 'Sleep Quality',
    icon: '🛌',
    category: 'health',
    target: 8,
    unit: 'hours',
    currentStreak: 3,
    longestStreak: 5,
    data: [7.2, 6.8, 8.1, 7.5, 6.9, 8.3, 7.8],
    color: '#6366f1',
  },
  {
    id: 2,
    name: 'Water Intake',
    icon: '💧',
    category: 'health',
    target: 8,
    unit: 'glasses',
    currentStreak: 5,
    longestStreak: 7,
    data: [6, 8, 7, 9, 8, 8, 7],
    color: '#0ea5e9',
  },
  {
    id: 3,
    name: 'Exercise',
    icon: '🏃',
    category: 'fitness',
    target: 30,
    unit: 'minutes',
    currentStreak: 2,
    longestStreak: 14,
    data: [45, 0, 30, 60, 20, 0, 45],
    color: '#10b981',
  },
  {
    id: 4,
    name: 'Meditation',
    icon: '🧘',
    category: 'mindfulness',
    target: 10,
    unit: 'minutes',
    currentStreak: 7,
    longestStreak: 21,
    data: [10, 15, 10, 12, 10, 15, 10],
    color: '#8b5cf6',
  },
];

const SCREEN_TIME_DATA: ScreenTimeItem[] = [
  { name: 'Productive', value: 3.2, color: '#10b981' },
  { name: 'Neutral', value: 2.5, color: '#6366f1' },
  { name: 'Social', value: 1.8, color: '#8b5cf6' },
  { name: 'Entertainment', value: 1.5, color: '#0ea5e9' },
];

const MOOD_DATA: MoodDataItem[] = [
  { day: 'Mon', value: 7 },
  { day: 'Tue', value: 5 },
  { day: 'Wed', value: 8 },
  { day: 'Thu', value: 8 },
  { day: 'Fri', value: 9 },
  { day: 'Sat', value: 8 },
  { day: 'Sun', value: 7 },
];

export default function WellnessTracker(): React.ReactElement {
  // States
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminders, setShowReminders] = useState<boolean>(false);
  const [showReminderForm, setShowReminderForm] = useState<boolean>(false);
  const [currentHabitForReminder, setCurrentHabitForReminder] = useState<Habit | null>(null);
  const [reminderTime, setReminderTime] = useState<string>('12:00');
  const [reminderMessage, setReminderMessage] = useState<string>('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [unreadReminders, setUnreadReminders] = useState<number>(0);

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');
  const [appView, setAppView] = useState<'dashboard' | 'habits'>('dashboard');
  const [showAddHabit, setShowAddHabit] = useState<boolean>(false);
  const [habits, setHabits] = useState<Habit[]>(MOCK_HABITS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Add Habit Form State
  const [newHabitName, setNewHabitName] = useState<string>('');
  const [newHabitCategory, setNewHabitCategory] = useState<Habit['category']>('health');
  const [newHabitTarget, setNewHabitTarget] = useState<number>(1);
  const [newHabitUnit, setNewHabitUnit] = useState<string>('times');
  const [newHabitIcon, setNewHabitIcon] = useState<string>('⭐');
  const [newHabitColor, setNewHabitColor] = useState<string>('#6366f1');

  // Check reminders for matching current time and trigger notification
  const checkReminders = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    let newUnreadCount = 0;

    reminders.forEach((reminder) => {
      if (reminder.isActive && reminder.time === currentTime) {
        triggerNotification(reminder);
        setReminders((prev) =>
          prev.map((r) => (r.id === reminder.id ? { ...r, isActive: false } : r))
        );
        newUnreadCount++;
      }
    });

    if (newUnreadCount > 0) {
      setUnreadReminders((prev) => prev + newUnreadCount);
    }
  }, [reminders]);

  // Load reminders and notification permission, set interval to check reminders
  useEffect(() => {
    const savedReminders = localStorage.getItem('reminders');
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders));
    }

    const reminderInterval = setInterval(() => {
      checkReminders();
    }, 30000);

    return () => clearInterval(reminderInterval);
  }, [checkReminders]);

  // Save reminders to localStorage on change
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return null;
  };

  // Trigger browser notification
  const triggerNotification = (reminder: Reminder) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(`Reminder: ${reminder.habitName}`, {
        body: reminder.message,
        icon: '/favicon.ico',
      });
      notification.onclick = () => {
        window.focus();
        setShowReminders(true);
      };
    }
  };

  // Add new reminder
  const addReminder = () => {
    if (!currentHabitForReminder) return;
    const newReminder: Reminder = {
      id: Date.now(),
      habitId: currentHabitForReminder.id,
      habitName: currentHabitForReminder.name,
      habitIcon: currentHabitForReminder.icon,
      time: reminderTime,
      message: reminderMessage || `Time to work on your ${currentHabitForReminder.name} habit!`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setReminders((prev) => [...prev, newReminder]);
    setShowReminderForm(false);
    setReminderMessage('');

    if (notificationPermission !== 'granted') {
      requestNotificationPermission();
    }
  };

  // Clear reminder
  const clearReminder = (reminderId: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
  };

  // Mark reminders as read
  const markRemindersAsRead = () => {
    setUnreadReminders(0);
  };

  // Habit toggles and update functions
  const toggleDay = (habitId: number, dayIndex: number) => {
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id === habitId) {
          const newData = [...habit.data];
          newData[dayIndex] = newData[dayIndex] >= habit.target ? 0 : habit.target;

          let currentStreak = 0;
          let longestStreak = habit.longestStreak;
          for (let i = newData.length - 1; i >= 0; i--) {
            if (newData[i] >= habit.target) currentStreak++;
            else break;
          }
          if (currentStreak > longestStreak) longestStreak = currentStreak;

          return { ...habit, data: newData, currentStreak, longestStreak };
        }
        return habit;
      })
    );
  };

  // Create new habit
  const handleCreateHabit = () => {
    if (!newHabitName.trim()) {
      alert('Please enter a habit name');
      return;
    }
    const newHabit: Habit = {
      id: Date.now(),
      name: newHabitName.trim(),
      icon: newHabitIcon,
      category: newHabitCategory,
      target: newHabitTarget,
      unit: newHabitUnit,
      currentStreak: 0,
      longestStreak: 0,
      data: Array(7).fill(0),
      color: newHabitColor,
    };
    setHabits((prev) => [...prev, newHabit]);
    setShowAddHabit(false);
    setNewHabitName('');
    setNewHabitCategory('health');
    setNewHabitTarget(1);
    setNewHabitUnit('times');
    setNewHabitIcon('⭐');
    setNewHabitColor('#6366f1');
  };

  // Helpers
  const getWeeklyAverage = (habit: Habit): string => {
    return (habit.data.reduce((a, b) => a + b, 0) / 7).toFixed(1);
  };

  const getStreakEmoji = (streak: number): string => {
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '📊';
  };

  // Calculated sums for screen time and mood averages
  const totalScreenTime = SCREEN_TIME_DATA.reduce((acc, item) => acc + item.value, 0);
  const averageMood = (MOOD_DATA.reduce((acc, item) => acc + item.value, 0) / 7).toFixed(1);





  
/*---------------------------------------------------------------*/
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-200">
      {/* Landing Page */}
      <AnimatePresence>
        {currentView === 'landing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen text-center px-4 relative overflow-hidden"
          >
            {/* Background gradient circles */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400 dark:bg-blue-700 rounded-full opacity-20 filter blur-3xl"></div>
              <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-400 dark:bg-purple-700 rounded-full opacity-20 filter blur-3xl"></div>
              <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-green-400 dark:bg-green-700 rounded-full opacity-20 filter blur-3xl"></div>
            </div>

            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent"
            >
              Wellness Tracker
            </motion.h1>

            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl"
            >
              Track your habits, monitor your well-being, and achieve your personal goals with powerful insights.
            </motion.p>

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium shadow-lg shadow-indigo-500/30"
                onClick={() => setCurrentView('app')}
              >
                Get Started
              </motion.button>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            >
              <div className="text-center p-6">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Track Habits</h3>
                <p className="text-gray-600 dark:text-gray-400">Monitor daily progress and build lasting habits</p>
              </div>

              <div className="text-center p-6">
                <div className="bg-violet-100 dark:bg-violet-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Visual Stats</h3>
                <p className="text-gray-600 dark:text-gray-400">See your progress with beautiful visual data</p>
              </div>

              <div className="text-center p-6">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Achieve Goals</h3>
                <p className="text-gray-600 dark:text-gray-400">Set targets and celebrate your streaks</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App */}
      {currentView === 'app' && (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* Navbar */}
          <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg p-4 mb-8 rounded-xl sticky top-4 z-10">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Wellness Tracker
              </h1>
              <div className="flex items-center gap-4">
                {/* Theme Toggle Button */}
                <button
                  onClick={() => {
                    setDarkMode(!darkMode);
                    document.documentElement.classList.toggle('dark', !darkMode);
                    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Toggle theme"
                >
                  {darkMode ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M6 0a6 6 0 0 0 0 12A6 6 0 0 0 6 0zm0 1a5 5 0 0 1 0 10A5 5 0 0 1 6 1z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 0a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 0zm0 14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5zm7-6a.5.5 0 0 1 .5.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm-14 0a.5.5 0 0 1 .5.5H1a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5zm11.657-4.657a.5.5 0 0 1 .707 0l.707.707a.5.5 0 0 1-.707.707l-.707-.707a.5.5 0 0 1 0-.707zm-9.9 9.9a.5.5 0 0 1 .707 0l.707.707a.5.5 0 0 1-.707.707l-.707-.707a.5.5 0 0 1 0-.707zm9.9 0a.5.5 0 0 1 0 .707l-.707.707a.5.5 0 0 1-.707-.707l.707-.707a.5.5 0 0 1 .707 0zm-9.9-9.9a.5.5 0 0 1 0 .707L1.757 2.464a.5.5 0 1 1-.707-.707l.707-.707a.5.5 0 0 1 .707 0z" />
                    </svg>
                  )}
                </button>

                {/* Notifications Button */}
                <button
                  onClick={() => {
                    setShowReminders(!showReminders);
                    markRemindersAsRead();
                  }}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Notifications"
                >
                  Notifications
                </button>
              </div>
            </div>
          </nav>

          

          {/* Dashboard View */}
          {appView === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-8 rounded-2xl shadow-lg mb-8">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                    <p className="opacity-90">
                      You're on track with {habits.filter((h) => h.currentStreak > 0).length} of your {habits.length} habits this week.
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span className="text-5xl">✨</span>
                  </div>
                </div>
              </div>

              {/* Stats Overview Cards */}
              <div>
                <h3 className="text-xl font-semibold mb-4 px-1">Your Health Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {habits.slice(0, 3).map((habit) => (
                    <div
                      key={habit.id}
                      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg transition-transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{habit.icon}</span>
                        <h4 className="text-lg font-semibold">{habit.name}</h4>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-3xl font-bold">{getWeeklyAverage(habit)}</span>
                          <span className="text-sm ml-1 text-gray-500 dark:text-gray-400">{habit.unit}</span>
                        </div>
                        <div
                          className={`py-1 px-3 rounded-full flex items-center gap-1 text-sm font-medium ${
                            habit.currentStreak >= 3
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {getStreakEmoji(habit.currentStreak)} {habit.currentStreak} day streak
                        </div>
                      </div>

                      <ResponsiveContainer width="100%" height={80}>
                        {habit.name === 'Water Intake' ? (
                          <BarChart data={habit.data.map((val, i) => ({ day: weekdays[i], value: val }))}>
                            <Bar dataKey="value" fill={habit.color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <LineChart data={habit.data.map((val, i) => ({ day: weekdays[i], value: val }))}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={habit.color}
                              strokeWidth={2}
                              dot={{ r: 4, fill: habit.color, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ))}

                  {/* Screen Time Card */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📱</span>
                      <h4 className="text-lg font-semibold">Screen Time</h4>
                    </div>

                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={100} height={100}>
                        <PieChart>
                          <Pie
                            data={SCREEN_TIME_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            stroke="none"
                            dataKey="value"
                          >
                            {SCREEN_TIME_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      <div>
                        <div className="text-2xl font-bold mb-1">{totalScreenTime.toFixed(1)} hrs</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Daily average</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {SCREEN_TIME_DATA.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.name}: <span className="font-medium">{item.value} hrs</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mood Card */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">😊</span>
                      <h4 className="text-lg font-semibold">Mood Tracker</h4>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-3xl font-bold">{averageMood}</span>
                        <span className="text-sm ml-1 text-gray-500 dark:text-gray-400">/10</span>
                      </div>
                      <div className="py-1 px-3 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 flex items-center gap-1 text-sm font-medium">
                        Weekly average
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={MOOD_DATA}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Weekly Overview */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold mb-6">Weekly Progress</h3>
                <div className="overflow-x-auto">
                  <div className="min-w-max grid grid-cols-7 gap-2 md:gap-4">
                    {weekdays.map((day, index) => (
                      <div key={day} className="text-center">
                        <p className="text-sm font-medium mb-3">{day}</p>
                        <div className="space-y-2">
                          {habits.map((habit) => (
                            <div key={habit.id} className="w-full">
                              <div
                                className={`h-3 rounded-full ${
                                  habit.data[index] >= habit.target
                                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                                title={`${habit.name}: ${habit.data[index]} ${habit.unit}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  {habits.map((habit) => (
                    <div key={habit.id} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color }}></span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{habit.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Habits View */}
          {appView === 'habits' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">Daily Habits</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Track your daily progress</p>
                </div>
                <button
                  onClick={() => setShowAddHabit(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Add Habit</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Habits List */}
              <div className="grid md:grid-cols-2 gap-6">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                          <span className="text-2xl">{habit.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold dark:text-white">{habit.name}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Target: {habit.target} {habit.unit}/day
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-medium ${
                            habit.currentStreak >= habit.target ? 'text-green-500' : 'text-amber-500'
                          } flex items-center gap-1`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2l1.67 5.12h5.4l-4.35 3.15 1.67 5.12L12 12.23l-4.39 3.16 1.67-5.12-4.35-3.15h5.4z" />
                          </svg>
                          {habit.currentStreak} day streak
                        </span>

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => {
                              setCurrentHabitForReminder(habit);
                              setShowReminderForm(true);
                            }}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                            title="Set reminder"
                            aria-label={`Set reminder for ${habit.name}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
                              <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" />
                            </svg>
                          </button>
                          <button
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                            title="Edit habit (functionality to add)"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete habit (functionality to add)"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={habit.target * 1.5}
                          value={habit.data[6]}
                          onChange={() => toggleDay(habit.id, 6)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-gray-700"
                          aria-label={`Adjust current day value for ${habit.name}`}
                        />
                        <span className="dark:text-white font-medium min-w-12 text-center">
                          {habit.data[6]} {habit.unit}
                        </span>
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {habit.data.map((value, index) => (
                          <button
                            key={index}
                            onClick={() => toggleDay(habit.id, index)}
                            className={`p-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                              value >= habit.target
                                ? 'bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                                : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            aria-pressed={value >= habit.target}
                            aria-label={`${weekdays[index]}: ${value} ${habit.unit}`}
                          >
                            <span className="text-xs font-medium">{weekdays[index][0]}</span>
                            {value >= habit.target && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mt-1"
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Add Habit Modal */}
          <AnimatePresence>
            {showAddHabit && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setShowAddHabit(false)}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">Create New Habit</h3>
                    <button
                      onClick={() => setShowAddHabit(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      aria-label="Close add habit modal"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habit Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Morning Workout"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select
                        value={newHabitCategory}
                        onChange={(e) => setNewHabitCategory(e.target.value as Habit['category'])}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="health">Health & Fitness</option>
                        <option value="productivity">Productivity</option>
                        <option value="personal">Personal Growth</option>
                        <option value="social">Social</option>
                        <option value="fitness">Fitness</option>
                        <option value="mindfulness">Mindfulness</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Target</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={newHabitTarget}
                          onChange={(e) => setNewHabitTarget(Number(e.target.value))}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                        <select
                          value={newHabitUnit}
                          onChange={(e) => setNewHabitUnit(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="times">times</option>
                          <option value="hours">hours</option>
                          <option value="minutes">minutes</option>
                          <option value="glasses">glasses</option>
                          <option value="pages">pages</option>
                          <option value="steps">steps</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          maxLength={2}
                          value={newHabitIcon}
                          onChange={(e) => setNewHabitIcon(e.target.value)}
                          className="w-16 h-16 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-2xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex-1">
                          <div className="grid grid-cols-5 gap-2">
                            {['💪', '🏃', '📚', '💧', '🧘', '🥗', '💤', '❌', '✏️', '🎵'].map((icon) => (
                              <button
                                key={icon}
                                onClick={() => setNewHabitIcon(icon)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  newHabitIcon === icon ? 'bg-blue-100 dark:bg-blue-900 border border-blue-500' : ''
                                }`}
                                aria-label={`Select icon ${icon}`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={() => setShowAddHabit(false)}
                        className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateHabit}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                      >
                        Create Habit
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reminder Form Modal */}
          <AnimatePresence>
            {showReminderForm && currentHabitForReminder && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setShowReminderForm(false)}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">Set Reminder for {currentHabitForReminder.name}</h3>
                    <button
                      onClick={() => setShowReminderForm(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      aria-label="Close reminder form"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-2xl">{currentHabitForReminder.icon}</span>
                      <div>
                        <div className="font-medium dark:text-white">{currentHabitForReminder.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Target: {currentHabitForReminder.target} {currentHabitForReminder.unit}/day
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder Time</label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message (Optional)</label>
                      <input
                        type="text"
                        placeholder={`Time to work on your ${currentHabitForReminder.name} habit!`}
                        value={reminderMessage}
                        onChange={(e) => setReminderMessage(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {notificationPermission !== 'granted' && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 text-sm rounded-lg">
                        <p className="mb-2">Notifications are required for reminders to work.</p>
                        <button
                          onClick={requestNotificationPermission}
                          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          Enable notifications
                        </button>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={() => setShowReminderForm(false)}
                        className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addReminder}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                      >
                        Set Reminder
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <footer className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-12 text-center text-gray-600 dark:text-gray-400">
            Made by Kishori Rai
          </footer>
        </div>
      )}
    </div>
  );
}
