import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import DocumentUploadScreen from '../screens/DocumentUploadScreen';

// Placeholder screens - will be implemented
const DashboardScreen = () => <Text>Dashboard</Text>;
const AppointmentsScreen = () => <Text>Appointments</Text>;
const CustomersScreen = () => <Text>Customers</Text>;
const StaffScreen = () => <Text>Staff</Text>;
const InventoryScreen = () => <Text>Inventory</Text>;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Staff" component={StaffScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator;

