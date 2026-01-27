import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

export default function EventRecurrenceManager({ eventId, onRecurrenceSet }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recurrence, setRecurrence] = useState({
    frequency: 'weekly',
    interval: 1,
    day_of_week: [],
    end_type: 'never',
    end_count: null,
    end_date: null
  });

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleDayToggle = (dayIndex) => {
    setRecurrence(prev => ({
      ...prev,
      day_of_week: prev.day_of_week.includes(dayIndex)
        ? prev.day_of_week.filter(d => d !== dayIndex)
        : [...prev.day_of_week, dayIndex]
    }));
  };

  const handleSubmit = () => {
    onRecurrenceSet(recurrence);
    setIsOpen(false);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-zinc-200">Recurrence</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700">
                <Plus className="w-3 h-3 mr-1" /> Set Recurrence
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Set Event Recurrence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-zinc-400">Frequency</Label>
                  <Select value={recurrence.frequency} onValueChange={(val) => setRecurrence({ ...recurrence, frequency: val })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-zinc-400">Interval (every N periods)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={recurrence.interval}
                    onChange={(e) => setRecurrence({ ...recurrence, interval: parseInt(e.target.value) })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>

                {recurrence.frequency === 'weekly' && (
                  <div>
                    <Label className="text-xs text-zinc-400">Days of Week</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {daysOfWeek.map((day, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox
                            checked={recurrence.day_of_week.includes(idx)}
                            onCheckedChange={() => handleDayToggle(idx)}
                          />
                          <span className="text-sm text-zinc-300">{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurrence.frequency === 'monthly' && (
                  <div>
                    <Label className="text-xs text-zinc-400">Day of Month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={recurrence.day_of_month || ''}
                      onChange={(e) => setRecurrence({ ...recurrence, day_of_month: parseInt(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs text-zinc-400">End Type</Label>
                  <Select value={recurrence.end_type} onValueChange={(val) => setRecurrence({ ...recurrence, end_type: val })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="after_count">After N occurrences</SelectItem>
                      <SelectItem value="on_date">On specific date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrence.end_type === 'after_count' && (
                  <div>
                    <Label className="text-xs text-zinc-400">Number of Occurrences</Label>
                    <Input
                      type="number"
                      min="1"
                      value={recurrence.end_count || ''}
                      onChange={(e) => setRecurrence({ ...recurrence, end_count: parseInt(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                )}

                {recurrence.end_type === 'on_date' && (
                  <div>
                    <Label className="text-xs text-zinc-400">End Date</Label>
                    <Input
                      type="date"
                      value={recurrence.end_date || ''}
                      onChange={(e) => setRecurrence({ ...recurrence, end_date: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                )}

                <Button onClick={handleSubmit} className="w-full bg-red-600 hover:bg-red-700">
                  Set Recurrence
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-zinc-500">Configure how often this event repeats</p>
      </CardContent>
    </Card>
  );
}