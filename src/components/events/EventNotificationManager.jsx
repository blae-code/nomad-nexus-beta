import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Plus, Trash2 } from 'lucide-react';

export default function EventNotificationManager({ eventId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notification, setNotification] = useState({
    type: 'reminder',
    trigger_type: 'minutes_before',
    trigger_value: 15,
    message: ''
  });

  const queryClient = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ['event-notifications', eventId],
    queryFn: () => base44.entities.EventNotification.filter({ event_id: eventId }),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EventNotification.create({
      event_id: eventId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-notifications', eventId] });
      setNotification({ type: 'reminder', trigger_type: 'minutes_before', trigger_value: 15, message: '' });
      setIsOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EventNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-notifications', eventId] })
  });

  const handleSubmit = () => {
    createMutation.mutate(notification);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700">
                <Plus className="w-3 h-3 mr-1" /> Add Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Add Event Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-zinc-400">Notification Type</Label>
                  <Select value={notification.type} onValueChange={(val) => setNotification({ ...notification, type: val })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="event_created">Event Created</SelectItem>
                      <SelectItem value="event_updated">Event Updated</SelectItem>
                      <SelectItem value="event_cancelled">Event Cancelled</SelectItem>
                      <SelectItem value="status_change">Status Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">Trigger Type</Label>
                    <Select value={notification.trigger_type} onValueChange={(val) => setNotification({ ...notification, trigger_type: val })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes_before">Minutes Before</SelectItem>
                        <SelectItem value="hours_before">Hours Before</SelectItem>
                        <SelectItem value="days_before">Days Before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Value</Label>
                    <Input
                      type="number"
                      min="1"
                      value={notification.trigger_value}
                      onChange={(e) => setNotification({ ...notification, trigger_value: parseInt(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-zinc-400">Message (optional)</Label>
                  <Input
                    placeholder="Custom notification message..."
                    value={notification.message}
                    onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full bg-red-600 hover:bg-red-700">
                  Add Notification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-xs text-zinc-500">No notifications set</p>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className="flex items-center justify-between p-2 bg-zinc-950/50 border border-zinc-800/50 rounded text-sm">
              <div>
                <div className="font-bold text-zinc-200 capitalize">{notif.type.replace('_', ' ')}</div>
                <div className="text-xs text-zinc-500">{notif.trigger_value} {notif.trigger_type.replace('_', ' ')}</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-zinc-500 hover:text-red-400"
                onClick={() => deleteMutation.mutate(notif.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}