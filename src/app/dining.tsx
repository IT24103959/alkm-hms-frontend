import { useAuth } from '@/context/AuthContext';
import CustomerRestaurantScreen from '@/screens/CustomerRestaurantScreen';
import RestaurantScreen from '@/screens/RestaurantScreen';

export default function DiningRoute() {
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    return <CustomerRestaurantScreen />;
  }

  return <RestaurantScreen />;
}
