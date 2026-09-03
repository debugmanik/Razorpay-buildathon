import {
  LayoutDashboard,
  ListTodo,
  LineChart,
  ShieldAlert,
  Settings,
} from 'lucide-react';

export const navigationConfig = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Recovery Queue',
    href: '/recovery',
    icon: ListTodo,
  },

  {
    title: 'Analytics',
    href: '/analytics',
    icon: LineChart,
  },
  {
    title: 'Audit Log',
    href: '/audit',
    icon: ShieldAlert,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];
