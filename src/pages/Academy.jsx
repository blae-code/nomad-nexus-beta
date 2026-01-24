import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Radio, Zap, Lightbulb, HelpCircle } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import BasicCommsGuide from '@/components/academy/BasicCommsGuide.jsx';
import AdvancedCommsGuide from '@/components/academy/AdvancedCommsGuide.jsx';
import BasicOpsGuide from '@/components/academy/BasicOpsGuide.jsx';
import AdvancedOpsGuide from '@/components/academy/AdvancedOpsGuide.jsx';
import InteractiveOpsWalkthrough from '@/components/academy/InteractiveOpsWalkthrough.jsx';
import InteractiveCommsWalkthrough from '@/components/academy/InteractiveCommsWalkthrough.jsx';
import QuickReferenceGuide from '@/components/academy/QuickReferenceGuide.jsx';
import CommonScenarios from '@/components/academy/CommonScenarios.jsx';

export default function AcademyPage() {
  const [activeTab, setActiveTab] = useState('comms-basic');

  return (
    <PageLayout 
      title="Nexus Academy"
      subtitle="Master comms and operations in Nexus"
    >
      <div className="h-full overflow-hidden flex flex-col bg-zinc-950">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-zinc-800 px-4 shrink-0 bg-zinc-900/40 overflow-x-auto">
            <TabsList className="h-9 gap-0.5 bg-transparent border-none whitespace-nowrap">
              <div className="flex items-center gap-1 px-2 py-1 border-r border-zinc-800">
                <Radio className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase">Communications</span>
              </div>
              
              <TabsTrigger value="comms-basic" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Basics
              </TabsTrigger>
              <TabsTrigger value="comms-advanced" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Advanced
              </TabsTrigger>
              <TabsTrigger value="comms-walkthrough" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Walkthrough
              </TabsTrigger>

              <div className="flex items-center gap-1 px-2 py-1 border-l border-r border-zinc-800 ml-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase">Operations</span>
              </div>

              <TabsTrigger value="ops-basic" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Basics
              </TabsTrigger>
              <TabsTrigger value="ops-advanced" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Advanced
              </TabsTrigger>
              <TabsTrigger value="ops-walkthrough" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Walkthrough
              </TabsTrigger>

              <div className="flex items-center gap-1 px-2 py-1 border-l border-r border-zinc-800 ml-2">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase">Resources</span>
              </div>

              <TabsTrigger value="reference" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Quick Ref
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                Scenarios
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="comms-basic" className="h-full overflow-y-auto m-0">
              <BasicCommsGuide />
            </TabsContent>

            <TabsContent value="comms-advanced" className="h-full overflow-y-auto m-0">
              <AdvancedCommsGuide />
            </TabsContent>

            <TabsContent value="comms-walkthrough" className="h-full overflow-y-auto m-0">
              <InteractiveCommsWalkthrough />
            </TabsContent>

            <TabsContent value="ops-basic" className="h-full overflow-y-auto m-0">
              <BasicOpsGuide />
            </TabsContent>

            <TabsContent value="ops-advanced" className="h-full overflow-y-auto m-0">
              <AdvancedOpsGuide />
            </TabsContent>

            <TabsContent value="ops-walkthrough" className="h-full overflow-y-auto m-0">
              <InteractiveOpsWalkthrough />
            </TabsContent>

            <TabsContent value="reference" className="h-full overflow-y-auto m-0">
              <QuickReferenceGuide />
            </TabsContent>

            <TabsContent value="scenarios" className="h-full overflow-y-auto m-0">
              <CommonScenarios />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PageLayout>
  );
}