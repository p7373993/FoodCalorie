import type { UserProfile, Badge, DailyLog, DietMeal } from '@/types/diet-profile';

export const createMockData = (): { userProfile: UserProfile; badges: Badge[]; dailyLogs: DailyLog[] } => {
    const userProfile: UserProfile = { 
        name: 'testuser', 
        avatarUrl: 'https://picsum.photos/seed/user/100/100', 
        calorieGoal: 2000,
        nutrientGoals: {
            protein: 120,
            carbs: 250,
            fat: 65,
        }
    };
    
    const badges: Badge[] = [
        { id: '1', name: 'First Meal', icon: '🎉', description: 'Logged your very first meal.' },
        { id: '2', name: '7-Day Streak', icon: '🔥', description: 'Logged in for 7 days in a row.' },
        { id: '3', name: 'Protein Pro', icon: '💪', description: 'Met your protein goal 3 times.' },
        { id: '4', name: 'Perfect Week', icon: '🌟', description: 'Stayed within calorie goals for a week.' },
        { id: '5', name: 'Veggie Power', icon: '🥦', description: 'Ate 5 servings of vegetables in a day.' },
        { id: '6', name: 'Hydration Hero', icon: '💧', description: 'Drank 8 glasses of water.' },
    ];

    const today = new Date();
    const dailyLogs: DailyLog[] = Array.from({ length: 45 }).map((_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        let meals: DietMeal[] = [
            { id: `${dateString}-1`, name: 'Oatmeal with Berries', type: 'Breakfast', photoUrl: `https://picsum.photos/seed/${dateString}1/400/300`, nutrients: { calories: 350, protein: 10, carbs: 60, fat: 8, nutriScore: 'A' }, aiComment: 'A great, fiber-rich start to the day!' },
            { id: `${dateString}-2`, name: 'Grilled Chicken Salad', type: 'Lunch', photoUrl: `https://picsum.photos/seed/${dateString}2/400/300`, nutrients: { calories: 500, protein: 40, carbs: 20, fat: 30, nutriScore: 'A' }, aiComment: 'Excellent source of lean protein.' },
            { id: `${dateString}-3`, name: 'Salmon with Quinoa', type: 'Dinner', photoUrl: `https://picsum.photos/seed/${dateString}3/400/300`, nutrients: { calories: 600, protein: 45, carbs: 40, fat: 30, nutriScore: 'B' }, aiComment: 'Rich in Omega-3s. Well done!' },
        ];
        
        if (Math.random() > 0.5) {
             meals.push({ id: `${dateString}-4`, name: 'Apple Slices', type: 'Snack', photoUrl: `https://picsum.photos/seed/${dateString}4/400/300`, nutrients: { calories: 95, protein: 1, carbs: 25, fat: 0, nutriScore: 'A' }, aiComment: 'A healthy and refreshing snack.' });
        }
        
        if (Math.random() < 0.1) { // 10% chance of no logs for a day
            meals = [];
        } else {
            // Randomly remove some meals to make data more varied
            meals = meals.slice(0, Math.floor(Math.random() * meals.length) + 1);
            if (Math.random() > 0.9) { // 10% chance of a high-calorie day (outlier)
                meals.push({ id: `${dateString}-5`, name: 'Pizza Slice', type: 'Dinner', photoUrl: `https://picsum.photos/seed/${dateString}5/400/300`, nutrients: { calories: 800, protein: 25, carbs: 70, fat: 40, nutriScore: 'D' }, aiComment: 'A treat for today.' });
            }
        }

        return {
            date: dateString,
            meals: meals,
            mission: 'Drink 8 glasses of water today.',
            emotion: '😊',
            memo: 'Felt energetic today!'
        };
    }).reverse();
      
    return { userProfile, badges, dailyLogs };
};