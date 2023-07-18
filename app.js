const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const date_fns = require("date-fns");
var format = require("date-fns/format");

var isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializationServerAndDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
  }
};
initializationServerAndDB();

// API 1 GET
app.get("/todos/", async (request, response) => {
  const {
    priority = "%20",
    status = "%20",
    category = "%20",
    search_q = "%20",
  } = request.query;

  const isValidValue = (queryPara) => {
    let a = ["HIGH", "LOW", "MEDIUM"]; // priority
    let b = ["DONE", "IN PROGRESS", "TO DO"]; // Status
    let c = ["WORK", "HOME", "LEARNING"]; // Category

    let priorityVal = null;
    let statusVal = null;
    let categoryVal = null;

    if (priority === queryPara.priority) {
      let value = a.some((alpha) => alpha === priority);
      priorityVal = value;
    }
    if (status === queryPara.status) {
      let value = b.some((alpha) => alpha === status);
      statusVal = value;
    }
    if (category === queryPara.category) {
      let value = c.some((alpha) => alpha === category);
      categoryVal = value;
    }

    return [priorityVal, statusVal, categoryVal];
  };
  let a = request.query;

  let values = isValidValue(a);

  //console.log(values);

  if (values[0] === false) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (values[1] === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (values[2] === false) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const getTodoItems = `
  SELECT 
  id,
  todo,
  priority,
  status,
  category,
  due_date as dueDate
  FROM todo
  WHERE 
  todo LIKE '%${search_q}%' OR priority LIKE '%${priority}%' OR
  status LIKE '%${status}%'OR category LIKE '%${category}%'
  ;
  `;
    const dbTodo = await db.all(getTodoItems);
    response.send(dbTodo);
  }
});

// API 2 GET
app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;

  const getTodoItem = `
  SELECT 
  id,
  todo,
  priority,
  status,
  category,
  due_date as dueDate
  FROM todo
  WHERE id = ${todoId};
    `;
  const dbTodo = await db.get(getTodoItem);
  response.send(dbTodo);
});

// API 3 GET agenda
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  const isValidDate = isValid(new Date(date));

  if (isValidDate === true) {
    let formatDate = format(new Date(date), "yyyy-MM-dd");

    const getTodoItemBasedOnDate = `
  SELECT 
  id,
  todo,
  priority,
  status,
  category,
  due_date as dueDate
  FROM todo
  WHERE due_date LIKE '%${formatDate}%';
  `;
    const dbTodo = await db.all(getTodoItemBasedOnDate);
    response.send(dbTodo);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// API 4 POST Create A todo Item
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const isValidValue = (queryPara) => {
    let a = ["HIGH", "LOW", "MEDIUM"]; // priority
    let b = ["DONE", "IN PROGRESS", "TO DO"]; // Status
    let c = ["WORK", "HOME", "LEARNING"]; // Category

    let priorityVal = null;
    let statusVal = null;
    let categoryVal = null;
    let validDate = null;

    if (priority === queryPara.priority) {
      let value = a.some((alpha) => alpha === priority);
      priorityVal = value;
    }
    if (status === queryPara.status) {
      let value = b.some((alpha) => alpha === status);
      statusVal = value;
    }
    if (category === queryPara.category) {
      let value = c.some((alpha) => alpha === category);
      categoryVal = value;
    }

    try {
      let formatDate = format(new Date(queryPara.dueDate), "yyyy-LL-d");

      let isValidDate = isValid(new Date(formatDate));

      validDate = isValidDate;
    } catch (e) {
      let error = e.message;
      validDate = false;
    }

    return [priorityVal, statusVal, categoryVal, validDate];
  };
  let a = request.body;

  let values = isValidValue(a);

  console.log(values);

  if (values[0] === false) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (values[1] === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (values[2] === false) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (values[3] === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const createTodoItem = `
    INSERT INTO 
    todo (id, todo, priority, status, category, due_date)
    VALUES (
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
    );
    `;
    const dbTodo = await db.run(createTodoItem);
    console.log(dbTodo);
    response.send("Todo Successfully Added");
  }
});

// API 5 PUT Method Update todo details
app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const todoDetails = request.body;

  let updatedCol = "";
  let updatedObj;

  switch (true) {
    case todoDetails.status !== undefined:
      updatedCol = "Status";
      updatedObj = todoDetails.status;
      break;
    case todoDetails.priority !== undefined:
      updatedCol = "Priority";
      updatedObj = todoDetails.priority;
      break;
    case todoDetails.todo !== undefined:
      updatedCol = "Todo";
      updatedObj = todoDetails.todo;
      break;
    case todoDetails.category !== undefined:
      updatedCol = "Category";
      updatedObj = todoDetails.category;
      break;
    case todoDetails.dueDate !== undefined:
      updatedCol = "Due Date";
      updatedObj = todoDetails.dueDate;
      break;
  }
  //console.log(updatedCol);
  //console.log(updatedObj);

  const getTodoItemQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await db.get(getTodoItemQuery);

  const { id, todo, priority, status, category, dueDate } = request.body;

  const isValidValue = (queryPara) => {
    let a = ["HIGH", "LOW", "MEDIUM"]; // priority
    let b = ["DONE", "IN PROGRESS", "TO DO"]; // Status
    let c = ["WORK", "HOME", "LEARNING"]; // Category

    //let d = isValid(new Date(dueDate));

    let priorityVal = null;
    let statusVal = null;
    let categoryVal = null;
    let validDate = null;

    if (priority === queryPara) {
      let value = a.some((alpha) => alpha === priority);
      priorityVal = value;
    }
    if (status === queryPara) {
      let value = b.some((alpha) => alpha === status);
      statusVal = value;
    }
    if (category === queryPara) {
      let value = c.some((alpha) => alpha === category);
      categoryVal = value;
    }

    if (dueDate === queryPara) {
      try {
        let formatDate = format(new Date(queryPara), "yyyy-LL-d");

        let isValidDate = isValid(new Date(formatDate));

        validDate = isValidDate;
      } catch (e) {
        let error = e.message;
        validDate = false;
      }
    }

    return [priorityVal, statusVal, categoryVal, validDate];
  };
  //let a = request.body;
  let a = updatedObj;
  let values = isValidValue(a);

  if (values[0] === false) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (values[1] === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (values[2] === false) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (values[3] === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const {
      todo = previousTodo.todo,
      category = previousTodo.category,
      priority = previousTodo.priority,
      status = previousTodo.status,
      dueDate = previousTodo.due_date,
    } = request.body;
    const updateTodoItems = `
    UPDATE todo 
    SET
    todo = '${todo}',
    category = '${category}',
    priority = '${priority}',
    status = '${status}',
    due_date = '${dueDate}'
    WHERE id = ${todoId};
    `;
    await db.run(updateTodoItems);
    response.send(`${updatedCol} Updated`);
  }
});

// API 6 Delete Method
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteTodoItem = `DELETE FROM todo WHERE id = ${todoId}`;

  await db.run(deleteTodoItem);
  response.send("Todo Deleted");
});

module.exports = app;
