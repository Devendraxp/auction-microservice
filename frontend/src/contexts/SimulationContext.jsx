import React, { createContext, useState, useContext, useEffect } from 'react';
import { runGCAA } from '../utils/allocator';

// Create context
const SimulationContext = createContext();

// Custom hook for using simulation context
export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

// Provider component
export const SimulationProvider = ({ children }) => {
  // State for agents, tasks and assignments
  const [agents, setAgents] = useState(() => {
    const savedAgents = localStorage.getItem('gcaa_agents');
    return savedAgents ? JSON.parse(savedAgents) : [];
  });

  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('gcaa_tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  const [assignments, setAssignments] = useState(() => {
    const savedAssignments = localStorage.getItem('gcaa_assignments');
    return savedAssignments ? JSON.parse(savedAssignments) : null;
  });

  const [totalProfit, setTotalProfit] = useState(0);

  // Persist agents to localStorage when they change
  useEffect(() => {
    localStorage.setItem('gcaa_agents', JSON.stringify(agents));
  }, [agents]);

  // Persist tasks to localStorage when they change
  useEffect(() => {
    localStorage.setItem('gcaa_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Persist assignments to localStorage when they change
  useEffect(() => {
    if (assignments) {
      localStorage.setItem('gcaa_assignments', JSON.stringify(assignments));
    }
  }, [assignments]);

  // Run the GCAA simulation
  const runSimulation = () => {
    if (agents.length === 0 || tasks.length === 0) return;
    
    const result = runGCAA(agents, tasks);
    setAssignments(result.assignments);
    setTotalProfit(result.totalProfit);
    return result;
  };

  // Add a new agent
  const addAgent = (agent) => {
    setAgents(prev => [...prev, { ...agent, id: Date.now().toString() }]);
  };

  // Update an existing agent
  const updateAgent = (id, updates) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, ...updates } : agent
    ));
  };

  // Remove an agent
  const removeAgent = (id) => {
    setAgents(prev => prev.filter(agent => agent.id !== id));
  };

  // Add a new task
  const addTask = (task) => {
    setTasks(prev => [...prev, { ...task, id: Date.now().toString() }]);
  };

  // Add multiple tasks (e.g., from CSV import)
  const addTasks = (newTasks) => {
    setTasks(prev => [
      ...prev, 
      ...newTasks.map(task => ({
        ...task, 
        id: task.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }))
    ]);
  };

  // Remove a task
  const removeTask = (id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  // Clear all tasks
  const clearTasks = () => {
    setTasks([]);
    setAssignments(null);
  };

  // Reset simulation (clear assignments)
  const resetSimulation = () => {
    setAssignments(null);
    localStorage.removeItem('gcaa_assignments');
  };

  const value = {
    agents,
    tasks,
    assignments,
    totalProfit,
    addAgent,
    updateAgent,
    removeAgent,
    addTask,
    addTasks,
    removeTask,
    clearTasks,
    runSimulation,
    resetSimulation
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export default SimulationContext;