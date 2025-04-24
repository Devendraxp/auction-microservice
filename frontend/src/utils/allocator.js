/**
 * Performs the Greedy Coalition Auction Algorithm (GCAA)
 * Agents bid on tasks, and tasks are allocated to the highest bidder
 * @param {Array} agents - Array of agent objects with { id, name }
 * @param {Array} tasks - Array of task objects with { id, profits } where profits is an array of profit values for each agent
 * @return {Object} Result containing assignments for each agent and total profit
 */
export function runGCAA(agents, tasks) {
  // Input validation
  if (!agents?.length || !tasks?.length) {
    return { assignments: {}, totalProfit: 0 };
  }

  // Initialize assignments for each agent
  const assignments = {};
  let totalProfit = 0;
  let remainingTasks = [...tasks];
  
  agents.forEach(agent => {
    assignments[agent.id] = {
      agent: agent,
      tasks: [],
      totalProfit: 0
    };
  });
  
  // Continue until all agents have had a chance to bid on one task or no tasks remain
  // We need to ensure each agent gets one task before any agent gets a second task
  let allAgentsServed = false;
  
  while (remainingTasks.length > 0) {
    // For each task, find the agent with the highest bid (profit)
    const taskAssignments = [];

    // Create a map of agents who already have tasks assigned
    const agentsWithTasks = new Set();
    Object.values(assignments).forEach(agentData => {
      if (agentData.tasks.length > 0) {
        agentsWithTasks.add(agentData.agent.id);
      }
    });

    // If all agents have at least one task, reset the filter to allow second round
    if (agentsWithTasks.size === agents.length) {
      allAgentsServed = true;
    }

    // For each remaining task, collect the highest bidding agent
    for (const task of remainingTasks) {
      let highestBidAgent = null;
      let highestBid = -Infinity;

      // Find highest bidding agent for this task
      agents.forEach((agent, agentIndex) => {
        // Skip agents who already have tasks if not all agents have been served
        if (!allAgentsServed && agentsWithTasks.has(agent.id)) {
          return;
        }
        
        const profit = task.profits[agentIndex];
        if (profit > highestBid) {
          highestBid = profit;
          highestBidAgent = agent;
        }
      });

      // If we found a valid agent with positive profit
      if (highestBidAgent && highestBid >= 0) {
        taskAssignments.push({
          taskId: task.id,
          agentId: highestBidAgent.id,
          profit: highestBid
        });
      }
    }

    // If no valid assignments were found, break the loop
    if (taskAssignments.length === 0) break;

    // Sort task assignments by profit in descending order
    taskAssignments.sort((a, b) => b.profit - a.profit);

    // Keep track of which agents got a task this round
    const assignedAgents = new Set();
    
    // Assign tasks to agents
    for (const assignment of taskAssignments) {
      const { taskId, agentId, profit } = assignment;
      
      // Skip if this agent already got a task in this round
      if (assignedAgents.has(agentId)) continue;
      
      // Find the task object
      const taskIndex = remainingTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) continue; // Task was already assigned
      
      // Add task to agent's assignments
      assignments[agentId].tasks.push({
        taskId: taskId,
        profit: profit,
        taskNumber: taskId.replace('task_', '') // Extract the task number for display
      });
      
      // Update agent's total profit
      assignments[agentId].totalProfit += profit;
      
      // Update overall total profit
      totalProfit += profit;
      
      // Mark this agent as having gotten a task this round
      assignedAgents.add(agentId);
      
      // Remove task from remaining tasks
      remainingTasks.splice(taskIndex, 1);
    }

    // If we've assigned at least one task to each unassigned agent, 
    // or if no tasks were assigned at all, set allAgentsServed to true
    if (assignedAgents.size === agents.length - agentsWithTasks.size || assignedAgents.size === 0) {
      allAgentsServed = true;
    }
  }
  
  return { assignments, totalProfit };
}

/**
 * Process CSV data into task objects
 * @param {Array} data - 2D array from CSV
 * @param {number} agentCount - Number of agents
 * @return {Array} Array of task objects with profits
 */
export function processCSVData(data, agentCount) {
  // Skip header row if it exists (assume first row is header if it contains non-numeric values)
  const startRow = data.length > 0 && data[0].some(cell => isNaN(parseFloat(cell))) ? 1 : 0;
  
  return data.slice(startRow).map((row, index) => {
    const taskId = `task_${index + 1}`;
    let profits = [];
    
    // Check if each agent has one profit column or separate reward/cost columns
    if (row.length === agentCount) {
      // Simple case: each column represents profit for one agent
      profits = row.map(value => parseFloat(value) || 0);
    } else if (row.length === 2 * agentCount) {
      // Complex case: odd columns are reward, even columns are cost
      profits = Array(agentCount).fill(0);
      
      for (let i = 0; i < agentCount; i++) {
        const reward = parseFloat(row[i * 2]) || 0;
        const cost = parseFloat(row[i * 2 + 1]) || 0;
        profits[i] = reward - cost;
      }
    } else {
      // Fallback for incorrect format - assign zero profit
      profits = Array(agentCount).fill(0);
    }
    
    return {
      id: taskId,
      profits
    };
  });
}

/**
 * Calculate the best possible profit if each task is assigned to the agent that values it most
 * This serves as an optimal upper bound for comparison
 * @param {Array} tasks - Array of task objects with profits
 * @return {number} Maximum theoretical profit
 */
export function calculateOptimalProfit(tasks) {
  return tasks.reduce((sum, task) => {
    // Find the maximum profit any agent could get from this task
    const maxProfit = Math.max(...task.profits, 0);
    return sum + maxProfit;
  }, 0);
}