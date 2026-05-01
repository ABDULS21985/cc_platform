// Force dynamic rendering for this page
// Static export compatible
export const dynamic = 'auto';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Users, Star, TrendingUp, Filter } from 'lucide-react';

export default function ExplorePage() {
  return (
    <DashboardLayout pageTitle="Explore">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Explore</h1>
          <p className="text-sm text-gray-500">
            Welcome to your explore page. Here you can explore the community and
            view your community members.
          </p>
        </div>
        <div className="flex flex-col gap-4"></div>
      </div>
    </DashboardLayout>
  );
}
