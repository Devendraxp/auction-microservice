import React, { useState } from 'react';
import Papa from 'papaparse';
import { useSimulation } from '../../contexts/SimulationContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { processCSVData } from '../../utils/allocator';

const TaskInput = () => {
  const { agents, tasks, addTask, addTasks, removeTask, clearTasks } = useSimulation();
  const [taskProfits, setTaskProfits] = useState(Array(agents.length).fill(''));
  const [csvError, setCsvError] = useState(null);
  
  // Reset task profits when agent count changes
  React.useEffect(() => {
    setTaskProfits(Array(agents.length).fill(''));
  }, [agents.length]);

  const handleAddTask = (e) => {
    e.preventDefault();
    
    // Validate that at least one profit value is entered
    if (taskProfits.every(p => p === '')) {
      return;
    }

    const profits = taskProfits.map(value => parseFloat(value) || 0);
    
    addTask({
      profits
    });
    
    // Reset form
    setTaskProfits(Array(agents.length).fill(''));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCsvError(null);
    
    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          try {
            const processedTasks = processCSVData(results.data, agents.length);
            if (processedTasks.length === 0) {
              setCsvError('No valid task data found in CSV');
            } else {
              addTasks(processedTasks);
              e.target.value = null; // Reset file input
            }
          } catch (error) {
            setCsvError(`Error processing CSV data: ${error.message}`);
          }
        } else {
          setCsvError('No data found in CSV file');
        }
      },
      error: (error) => {
        setCsvError(`Error parsing CSV file: ${error.message}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-700 mb-2">Task Setup</h2>
        <p className="text-sm text-gray-600">
          Define tasks with profit values for each agent. A profit can be positive (gain) or negative (cost).
        </p>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Current Tasks ({tasks.length})</h3>
        
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No tasks added yet. Add tasks below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4">Task ID</th>
                  {agents.map((agent, index) => (
                    <th key={agent.id} className="py-3 px-4">
                      {agent.name} Profit
                    </th>
                  ))}
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="bg-white border-b">
                    <td className="py-3 px-4 font-medium">{task.id}</td>
                    {task.profits.map((profit, index) => (
                      <td key={index} className="py-3 px-4">
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {profit}
                        </span>
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => removeTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {tasks.length > 0 && (
          <div className="mt-4">
            <Button onClick={clearTasks} variant="outline" size="sm">
              Clear All Tasks
            </Button>
          </div>
        )}
      </div>

      {agents.length > 0 ? (
        <>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-md font-medium text-gray-700 mb-3">Add Task Manually</h3>
            
            <form onSubmit={handleAddTask}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {agents.map((agent, index) => (
                  <div key={agent.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {agent.name} Profit
                    </label>
                    <Input
                      type="number"
                      value={taskProfits[index]}
                      onChange={(e) => {
                        const newProfits = [...taskProfits];
                        newProfits[index] = e.target.value;
                        setTaskProfits(newProfits);
                      }}
                      placeholder="Enter profit value"
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div>
                <Button type="submit" disabled={agents.length === 0}>
                  Add Task
                </Button>
              </div>
            </form>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-md font-medium text-gray-700 mb-3">Import Tasks from CSV</h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file with task profit data. The file should have either:
              <ul className="list-disc pl-5 mt-2">
                <li>{agents.length} columns (one profit column per agent), or</li>
                <li>{agents.length * 2} columns (reward and cost columns for each agent)</li>
              </ul>
            </p>
            
            {csvError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                {csvError}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex-grow"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          <div className="bg-yellow-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No agents defined</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  You need to add at least one agent before adding tasks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskInput;