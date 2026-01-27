import React from 'react';
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";

export default function TransactionForm({ cofferId, eventId, triggerButton }) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState('deposit');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      amount: "",
      description: "",
      event_id: eventId || "none"
    }
  });

  // Fetch recent events for linkage if not provided
  const { data: events } = useQuery({
    queryKey: ['recent-events'],
    queryFn: () => base44.entities.Event.list({ sort: { start_time: -1 }, limit: 10 }),
    initialData: []
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const amount = parseFloat(data.amount);
      const finalAmount = type === 'deposit' ? Math.abs(amount) : -Math.abs(amount);
      
      return base44.entities.CofferTransaction.create({
        coffer_id: cofferId,
        user_id: currentUser.id,
        event_id: data.event_id === "none" ? null : data.event_id,
        amount: finalAmount,
        description: data.description,
        transaction_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setOpen(false);
      reset();
    }
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" /> New Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Record Transaction
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          
          <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg">
             <Button 
               type="button" 
               variant="ghost" 
               className={`flex-1 ${type === 'deposit' ? 'bg-emerald-950 text-emerald-500 hover:bg-emerald-900 hover:text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
               onClick={() => setType('deposit')}
             >
               <Plus className="w-4 h-4 mr-2" /> Deposit
             </Button>
             <Button 
               type="button" 
               variant="ghost" 
               className={`flex-1 ${type === 'withdrawal' ? 'bg-red-950 text-red-500 hover:bg-red-900 hover:text-red-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
               onClick={() => setType('withdrawal')}
             >
               <Minus className="w-4 h-4 mr-2" /> Spend
             </Button>
          </div>

          <div className="space-y-2">
             <Label>Amount (aUEC)</Label>
             <Input 
               type="number" 
               step="0.01" 
               placeholder="0.00"
               {...register("amount", { required: true, min: 0.01 })} 
               className="bg-zinc-900 border-zinc-800 text-lg font-mono" 
             />
          </div>

          <div className="space-y-2">
             <Label>Description</Label>
             <Input 
               {...register("description", { required: true })} 
               placeholder="e.g. Mission Payout, Ammo Resupply, Ship Repairs"
               className="bg-zinc-900 border-zinc-800" 
             />
          </div>

          {!eventId && (
            <div className="space-y-2">
              <Label>Link to Operation (Optional)</Label>
              <Select onValueChange={(val) => setValue('event_id', val)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select Operation..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                   <SelectItem value="none">No Link</SelectItem>
                   {events.map(e => (
                     <SelectItem key={e.id} value={e.id}>{e.title} ({new Date(e.start_time).toLocaleDateString()})</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-bold mt-4">
            Confirm Transaction
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}