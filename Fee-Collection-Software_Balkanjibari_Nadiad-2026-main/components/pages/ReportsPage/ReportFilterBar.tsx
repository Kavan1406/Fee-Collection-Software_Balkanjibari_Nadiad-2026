'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ReportFilterBarProps {
  onFilter: (startDate?: string, endDate?: string) => void;
  isLoading?: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  onFilter,
  isLoading = false,
}) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleFilter = () => {
    const start = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
    const end = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
    onFilter(start, end);
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFilter(undefined, undefined);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
      {/* Start Date Picker */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">From:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <input
              type="date"
              value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setStartDate(e.target.value ? new Date(e.target.value) : undefined)
              }
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date Picker */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">To:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <input
              type="date"
              value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setEndDate(e.target.value ? new Date(e.target.value) : undefined)
              }
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 ml-auto">
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button
          onClick={handleFilter}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Loading...' : 'Apply Filter'}
        </Button>
      </div>
    </div>
  );
};

export default ReportFilterBar;
