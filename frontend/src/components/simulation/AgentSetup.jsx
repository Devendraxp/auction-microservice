import React, { useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

const AgentSetup = () => {
  const { agents, addAgent, updateAgent, removeAgent } = useSimulation();
  const [newAgentName, setNewAgentName] = useState('');
  const [bulkCount, setBulkCount] = useState(3);

  const handleAddAgent = (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    
    addAgent({ name: newAgentName.trim() });
    setNewAgentName('');
  };

  const handleAddBulk = () => {
    const count = Math.min(Math.max(parseInt(bulkCount) || 0, 1), 20); // Between 1 and 20
    
    for (let i = 0; i < count; i++) {
      const agentNum = agents.length + i + 1;
      addAgent({ name: `Agent ${agentNum}` });
    }
  };

  const handleNameChange = (id, name) => {
    updateAgent(id, { name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-700 mb-2">Agent Setup</h2>
        <p className="text-sm text-gray-600">
          Configure the agents that will participate in the task allocation simulation.
          Each agent will bid on tasks based on their potential profit.
        </p>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Current Agents ({agents.length})</h3>
        
        {agents.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No agents added yet. Add agents below.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center border border-gray-200 rounded-md p-2">
                <Input 
                  value={agent.name}
                  onChange={(e) => handleNameChange(agent.id, e.target.value)}
                  className="mr-2"
                  placeholder="Agent name"
                />
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove agent"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Add New Agent</h3>
        
        <form onSubmit={handleAddAgent} className="flex items-end gap-2">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
            <Input 
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>
          <Button type="submit" size="md">
            Add Agent
          </Button>
        </form>

        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Bulk Add Agents</h4>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Agents</label>
              <Input 
                type="number" 
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)} 
                min="1"
                max="20"
                className="w-20"
              />
            </div>
            <Button onClick={handleAddBulk} variant="secondary" size="md">
              Add Multiple
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSetup;