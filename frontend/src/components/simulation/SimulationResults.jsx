import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { calculateOptimalProfit } from '../../utils/allocator';

const SimulationResults = () => {
  const { agents, tasks, assignments, totalProfit } = useSimulation();
  
  // Calculate the optimal profit (upper bound) for comparison
  const optimalProfit = calculateOptimalProfit(tasks);
  
  // Calculate efficiency (percentage of optimal profit achieved)
  const efficiency = optimalProfit > 0 ? ((totalProfit / optimalProfit) * 100).toFixed(2) : 100;
  
  // Extract task number from ID for more readable display
  const getTaskNumber = (taskId) => {
    if (taskId.startsWith('task_')) {
      return taskId.replace('task_', '');
    }
    
    // If it's not in task_N format, try to extract the last part of the ID
    const parts = taskId.split('_');
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
    
    return taskId;
  };

  // Find the original task for a taskId to get more info
  const getOriginalTask = (taskId) => {
    return tasks.find(task => task.id === taskId);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-700 mb-2">Simulation Results</h2>
        <p className="text-sm text-gray-600">
          Task allocation results from the greedy coalition auction algorithm.
        </p>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Profit</div>
            <div className="text-2xl font-bold text-blue-700">{totalProfit}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Optimal Profit (Upper Bound)</div>
            <div className="text-2xl font-bold text-blue-700">{optimalProfit}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Efficiency</div>
            <div className="text-2xl font-bold text-blue-700">{efficiency}%</div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Agent Allocations</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Assigned Tasks</th>
                <th className="py-3 px-4 text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(assignments).map(([agentId, agentData]) => (
                <tr key={agentId} className="bg-white border-b">
                  <td className="py-3 px-4 font-medium">
                    {agentData.agent.name}
                  </td>
                  <td className="py-3 px-4">
                    {agentData.tasks.length === 0 ? (
                      <span className="text-gray-400 italic">No tasks assigned</span>
                    ) : (
                      <div>
                        {agentData.tasks.map((task, index) => {
                          const taskNumber = getTaskNumber(task.taskId);
                          const originalTask = getOriginalTask(task.taskId);
                          return (
                            <div key={task.taskId} className="mb-1 last:mb-0">
                              <span className="font-medium">
                                Task {taskNumber}
                              </span>
                              <span className="text-gray-500 ml-2">
                                (ID: {task.taskId}, Profit: <span className={task.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {task.profit}
                                </span>)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-right">
                    <span className={agentData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {agentData.totalProfit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td className="py-3 px-4">Total</td>
                <td className="py-3 px-4">
                  {Object.values(assignments).reduce((sum, agent) => sum + agent.tasks.length, 0)} tasks
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {totalProfit}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Task Assignment Summary</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                // Find which agent was assigned this task
                let assignedAgent = null;
                let assignedProfit = 0;
                
                Object.values(assignments).forEach(agentData => {
                  const assignedTask = agentData.tasks.find(t => t.taskId === task.id);
                  if (assignedTask) {
                    assignedAgent = agentData.agent;
                    assignedProfit = assignedTask.profit;
                  }
                });
                
                const taskNumber = getTaskNumber(task.id);
                
                return (
                  <tr key={task.id} className="bg-white border-b">
                    <td className="py-3 px-4 font-medium">
                      Task {taskNumber} ({task.id})
                    </td>
                    <td className="py-3 px-4">
                      {assignedAgent ? (
                        assignedAgent.name
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-right">
                      {assignedAgent ? (
                        <span className={assignedProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {assignedProfit}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Allocation Details</h3>
        
        <div className="text-sm text-gray-600">
          <p>The Greedy Coalition Auction Algorithm (GCAA) assigned tasks by:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>For each task, finding the agent with the highest bid (profit value)</li>
            <li>Ensuring each agent receives one task before any agent receives a second task</li>
            <li>Prioritizing higher profit tasks when multiple agents bid on them</li>
            <li>Continuing until all tasks were allocated or no profitable tasks remained</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimulationResults;