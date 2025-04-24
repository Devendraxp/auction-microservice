import React, { useState } from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import Card from './ui/Card';
import Button from './ui/Button';
import AgentSetup from './simulation/AgentSetup';
import TaskInput from './simulation/TaskInput';
import SimulationResults from './simulation/SimulationResults';

const Simulation = () => {
  const { agents, tasks, assignments, runSimulation, resetSimulation } = useSimulation();
  const [activeTab, setActiveTab] = useState('agents');

  const handleRunSimulation = () => {
    runSimulation();
    setActiveTab('results');
  };

  const handleResetSimulation = () => {
    resetSimulation();
    setActiveTab('agents');
  };

  const canRunSimulation = agents.length > 0 && tasks.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Multi-Agent Task Allocation Simulation</h1>
      
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('agents')}
              className={`${
                activeTab === 'agents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              Agent Setup
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              Task Input
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
              disabled={!assignments}
            >
              Results
            </button>
          </nav>
        </div>
      </div>

      <Card>
        {activeTab === 'agents' && <AgentSetup />}
        {activeTab === 'tasks' && <TaskInput />}
        {activeTab === 'results' && assignments && <SimulationResults />}
      </Card>

      <div className="flex justify-end gap-4">
        {assignments ? (
          <>
            <Button onClick={handleResetSimulation} variant="outline">
              Reset Simulation
            </Button>
            <Button onClick={handleRunSimulation}>
              Re-run Simulation
            </Button>
          </>
        ) : (
          <Button onClick={handleRunSimulation} disabled={!canRunSimulation}>
            Run Simulation
          </Button>
        )}
      </div>
    </div>
  );
};

export default Simulation;