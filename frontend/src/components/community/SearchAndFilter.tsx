'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateCommunityDialog } from './CreateCommunityDialog';

export interface CommunityFilters {
  searchValue?: string;
  selectedFilter?: string;
}

interface SearchAndFilterProps {
  onRefresh?: ({searchValue, selectedFilter}: CommunityFilters) => void;
}

const SearchAndFilter = ({ onRefresh }: SearchAndFilterProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const toggleCreateDialog = () => {
    setIsCreateDialogOpen(!isCreateDialogOpen);
  };

  const filterOptions = [
    { value: 'recent', label: 'Recently Active' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest Circles' },
  ];

  const handleSuccess = () => {
    setSearchValue('');
    setSelectedFilter('recent');
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onRefresh) {
        onRefresh({searchValue, selectedFilter});
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [selectedFilter, searchValue]);

  return (
    <>
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8 bg-white/50 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-sm">
        {/* Modern Search Input */}
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0E9DA5] transition-colors" />
          <Input
            placeholder="Search communities by name or interest..."
            className="pl-11 pr-4 h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5] transition-all shadow-sm font-medium"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Refined Filter Select */}
          <div className="relative flex-1 md:w-56 group">
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5] focus:outline-none transition-all shadow-sm font-bold text-gray-600">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Sort By" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-100 rounded-2xl shadow-elevated p-1">
                {filterOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer rounded-xl hover:bg-teal-50 focus:bg-teal-50 text-gray-600 font-medium py-2.5 my-0.5 transition-colors"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create Button with Glow */}
          <Button
            className="bg-[#0E9DA5] hover:bg-[#0a7a80] text-white px-6 h-12 rounded-2xl font-bold flex items-center gap-2 shadow-glow hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
            onClick={toggleCreateDialog}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create Community</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      <CreateCommunityDialog
        isOpen={isCreateDialogOpen}
        toggleDialog={toggleCreateDialog}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default SearchAndFilter;
