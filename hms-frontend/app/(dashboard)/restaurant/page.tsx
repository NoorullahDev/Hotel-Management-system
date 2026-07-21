import React from 'react';
import RestaurantBoard from './_components/RestaurantBoard';

export const metadata = {
  title: 'Restaurant - HotelPrime',
  description: 'Manage restaurant orders, kitchen workflow and menu'
};

export default function RestaurantPage() {
  return <RestaurantBoard />;
}
