const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzE0ZGYzNTgzMzhlODE1YTU0YjQzMCIsImlhdCI6MTc2NDgzOTg4OSwiZXhwIjoxNzY1NDQ0Njg5fQ.JgAfzfQ8QKNanEXPHgpuuu2wj8HAaNOtU4ieLGFhZVE';

(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/tasks?assignedToMe=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('API Response Status:', response.status);
    console.log('Tasks Count:', data.count);
    console.log('Success:', data.success);
    
    if (data.data) {
      console.log('\nTasks:');
      data.data.forEach((task, i) => {
        console.log(`${i+1}. ${task.title}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
