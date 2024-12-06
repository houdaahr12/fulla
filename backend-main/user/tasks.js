// backend/tasks.js
import express from 'express';
import db from './db.js';

const router = express.Router();

// Get the number of tasks due today
router.get('/tasks/today', (req, res) => {
  const query = `
    SELECT COUNT(*) AS taskCount
    FROM tasks
    WHERE DATE(due_date) = CURDATE() 
      AND due_date > NOW()
      AND (status = 'pas commencé' OR status = 'en cours')
  `;
  
  db.query(query, (err, results) => { 
    if (err) {
      console.error('Error fetching tasks due today:', err);
      return res.status(500).send('Server Error');
    }
    res.json({ taskCount: results[0].taskCount });
  });
});

// Get all tasks due today and order by priority, filter by status
router.get('/tasks', (req, res) => {
  const query = `
    SELECT * 
    FROM tasks
    WHERE DATE(due_date) = CURDATE() 
      AND due_date > NOW()
      AND (status = 'pas commencé' OR status = 'en cours')
    ORDER BY FIELD(priority, 'urgent', 'important', 'moins important')
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      return res.status(500).send('Server Error');
    }
    res.json(results); 
  });
});

//update a task
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { task_name, category, due_date, status, priority } = req.body;

  const query = `
    UPDATE tasks 
    SET 
      task_name = ?, 
      category = ?, 
      due_date = ?, 
      status = ?, 
      priority = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [task_name, category, due_date, status, priority, id],
    (err, result) => {
      if (err) {
        console.error("Error updating task:", err);
        return res.status(500).json({ message: "Erreur lors de la mise à jour de la tâche." });
      }
      res.status(200).json({ message: "Tâche mise à jour avec succès." });
    }
  );
});

// API endpoint to fetch tasks grouped by status
router.get("/tasks-by-status", (req, res) => {
  const query = `
    SELECT * 
    FROM tasks
    ORDER BY FIELD(status, 'pas commence', 'en cours', 'termine')`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Erreur lors de la récupération des tâches :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    const groupedTasks = {
      "pas commence": [],
      "en cours": [],
      "termine": [],
    };

    results.forEach((task) => {
      if (groupedTasks[task.status]) {
        groupedTasks[task.status].push(task);
      }
    });

    res.json(groupedTasks);
  });
});

// router.put("/api/tasks/:id", async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   try {
//     // Update task in the database
//     const result = await db.query("UPDATE tasks SET status = ? WHERE id = ?", [
//       status,
//       id,
//     ]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Task not found" });
//     }

//     res.status(200).json({ message: "Task status updated successfully" });
//   } catch (error) {
//     console.error("Error updating task:", error);
//     res.status(500).json({ error: "Failed to update task status" });
//   }
// });
//task creation
router.post('/tasks-add', (req, res) => {
  const { task_name, category, due_date, due_time, priority } = req.body;
  const status = 'pas commencé'; 
  // Validate priority
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ message: "Priorité invalide." });
  }

  // Validate date and time
  const dueDateTime = due_time ? `${due_date} ${due_time}` : `${due_date} 00:00:00`;
  const dueDateObj = new Date(dueDateTime);

  if (isNaN(dueDateObj)) {
    return res.status(400).json({ message: "Date ou heure invalide." });
  }

  // Check if the due date is in the past
  const currentDate = new Date();
  if (dueDateObj < currentDate) {
    return res.status(400).json({ message: "La date d'échéance ne peut pas être dans le passé." });
  }
  if (!priority || !validPriorities.includes(priority)) {
  return res.status(400).json({ message: "La priorité est obligatoire et doit être valide." });
}

  // Insert the task into the database
  const query = `INSERT INTO tasks (task_name, category, due_date, priority, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
  const values = [task_name, category, dueDateTime, priority, status];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error inserting task:", err);
      return res.status(500).json({ message: "Erreur lors de l'insertion de la tâche." });
    }
    res.json({ message: "Tâche insérée avec succès !" });
  });
});

// Route to update task status
router.put('/tasks/:id/status', (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body; // Get the new status from the request body

  // Ensure the status is valid
  const validStatuses = ['pas commence', 'en cours', 'termine', 'annule'];
  if (!validStatuses.includes(status)) {
    return res.status(400).send('Invalid status');
  }

  // Update the task status in the database
  const query = `UPDATE tasks SET status = ? WHERE id = ?`;
  const values = [status, taskId];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating task status:', err);
      return res.status(500).send('Error updating task status');
    }

    if (result.affectedRows === 0) {
      return res.status(404).send('Task not found');
    }

    res.send('Task status updated successfully');
  });
});




// Endpoint to get completed tasks
router.get('/history', (req, res) => {
  const query = 'SELECT * FROM tasks WHERE status = "termine"';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching tasks');
    } else {
      res.json(results);
    }
  });
});


export default router;
