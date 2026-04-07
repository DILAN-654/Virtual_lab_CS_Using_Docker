const mongoose = require('mongoose');
const Task = require('../models/Task');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/virtual-lab-workbench');
    
    // Test the query with batch 2024
    const query = {
      $or: [
        { 'assignedTo.batch': '2024' }
      ]
    };
    
    const tasks = await Task.find(query);
    console.log('\n✓ Tasks found for batch 2024:', tasks.length);
    
    if (tasks.length > 0) {
      tasks.forEach((task, i) => {
        console.log(`\nTask ${i+1}: ${task.title}`);
        console.log('  AssignedTo:', JSON.stringify(task.assignedTo));
      });
    }
    
    // Also test the full $or query
    const fullQuery = {
      $or: [
        { 'assignedTo.userId': new mongoose.Types.ObjectId('69314df358338e815a54b42e') },
        { 'assignedTo.0.assignToAll': true },
        { 'assignedTo.batch': '2024' },
        { 'assignedTo.section': 'A' }
      ]
    };
    
    const allTasks = await Task.find(fullQuery);
    console.log('\n✓ Tasks found with full query:', allTasks.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
