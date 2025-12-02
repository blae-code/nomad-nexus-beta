import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2, Plus, Trash2, Zap } from "lucide-react";

export default function AgentRuleManager({ agentSlug }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['agent-rules', agentSlug],
    queryFn: () => base44.entities.AIAgentRule.list({ 
        filter: { agent_slug: agentSlug },
        sort: { created_date: -1 }
    }),
    enabled: isOpen
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.AIAgentRule.create({ ...data, agent_slug: agentSlug }),
    onSuccess: () => queryClient.invalidateQueries(['agent-rules', agentSlug])
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.AIAgentRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['agent-rules', agentSlug])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createRuleMutation.mutate({
      name: formData.get('name'),
      condition_metric: formData.get('metric'),
      condition_operator: formData.get('operator'),
      condition_value: Number(formData.get('value')),
      action_type: formData.get('action'),
      action_params: JSON.stringify({ role: formData.get('role_param') || '' }), // Simplified for demo
      is_active: true
    });
    e.target.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-500 hover:text-white" title="Configure Logic">
          <Settings2 className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase tracking-widest text-sm">
            <Zap className="w-4 h-4 text-indigo-500" />
            Logic Matrix: {agentSlug}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rule List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase">Active Directives</h3>
            {rules.length === 0 && <div className="text-zinc-600 text-xs italic">No logic routines active.</div>}
            {rules.map(rule => (
              <Card key={rule.id} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-3 flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-zinc-300">{rule.name}</div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-1">
                      IF {rule.condition_metric} {rule.condition_operator === 'lt' ? '<' : '>'} {rule.condition_value}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 mt-0.5 flex items-center gap-1">
                       THEN {rule.action_type}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-zinc-600 hover:text-red-400"
                    onClick={() => deleteRuleMutation.mutate(rule.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create Form */}
          <form onSubmit={handleSubmit} className="space-y-4 border-l border-zinc-800 pl-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase">New Directive</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-zinc-400">Directive Name</Label>
                <Input name="name" placeholder="e.g. Reserve Activation" className="h-8 bg-zinc-900 border-zinc-700 text-xs" required />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-[10px] text-zinc-400">Metric</Label>
                  <Select name="metric" defaultValue="medic_count">
                    <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medic_count">Medic Count</SelectItem>
                      <SelectItem value="ready_percent">Ready %</SelectItem>
                      <SelectItem value="down_count">Casualties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-zinc-400">Op</Label>
                  <Select name="operator" defaultValue="lt">
                    <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lt">&lt;</SelectItem>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="eq">=</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[10px] text-zinc-400">Threshold Value</Label>
                <Input name="value" type="number" defaultValue="1" className="h-8 bg-zinc-900 border-zinc-700 text-xs" required />
              </div>

              <div>
                <Label className="text-[10px] text-zinc-400">Action</Label>
                <Select name="action" defaultValue="AUTO_ASSIGN_ROLE">
                  <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO_ASSIGN_ROLE">Auto-Assign Role</SelectItem>
                    <SelectItem value="SEND_ALERT">Broadcast Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Dynamic param based on action (simplified) */}
              <div>
                 <Label className="text-[10px] text-zinc-400">Role (if assigning)</Label>
                 <Select name="role_param" defaultValue="MEDIC">
                    <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEDIC">Medic</SelectItem>
                      <SelectItem value="LOGISTICS">Logistics</SelectItem>
                      <SelectItem value="GUNNER">Gunner</SelectItem>
                    </SelectContent>
                 </Select>
              </div>

              <Button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-800 text-indigo-100 h-8 text-xs mt-2">
                <Plus className="w-3 h-3 mr-2" /> Add Logic
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}