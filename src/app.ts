// app.ts
import express, { Request, Response } from 'express';
import { Connection, createConnection, RowDataPacket } from 'mysql2'; // Updated import for mysql2
import fs from 'fs';
import { promisify } from 'util';

import { Column, Schema, Table } from './models';

export const app = express();
const readFileAsync = promisify(fs.readFile);
app.use(express.json());

const dbConfig: Parameters<typeof createConnection>[0] = {
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'CustomerDB',
  connectionLimit: 10, // Adjust this as per your needs
};

let db: Connection;
(async () => {
  try {
    db = await createConnection(dbConfig);
    console.log('Connected to MySQL database!');
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
  }
})();

function getCreateColumnSQL(column: Column) {
  let colSQL = `${column.name} ${column.type}`;
  if (column.isPrimaryKey) {
    colSQL += ' PRIMARY KEY';
    if (column.autoIncrement) {
      colSQL += ' AUTO_INCREMENT';
    }
  }
  if (column.unique) {
    colSQL += ' UNIQUE';
  }
  if (column.default) {
    colSQL += ` DEFAULT ${column.default}`;
  }
  return colSQL;
}

function createTables(tables: Table[]) {
  tables.forEach((table) => {
    const createTableSQL = `CREATE TABLE IF NOT EXISTS ${table.name} (${table.columns.map(col => getCreateColumnSQL(col)).join(", ")})`;
    db.query<RowDataPacket[]>(createTableSQL, (err, results) => {
      if (err) {
        console.error(`Error creating table ${table.name}: ${err.message}`);
      } else {
        console.log(`Table ${table.name} created.`);
        if (results) {
          console.log(results);
          const tableFields = results.map((field: any) => field.name);
          table.columns.forEach((column) => {
            if (!tableFields.includes(column.name)) {
              const alterTableSQL = `ALTER TABLE ${table.name} ADD COLUMN ${getCreateColumnSQL(column)}`;
              db.query(alterTableSQL, (err) => {
                if (err) {
                  console.error(`Error adding column ${column.name} to table ${table.name}: ${err.message}`);
                } else {
                  console.log(`Column ${column.name} added to table ${table.name}.`);
                }
              });
            }
          });
        }
      }
    });
  });
}

function tableNotFound(res: Response, tableName: string) {
  return res.status(404).json({ error: `Table '${tableName}' not found.` });
}

function columnNotFound(res: Response, columnName: string) {
  return res.status(404).json({ error: `Column '${columnName}' not found.` });
}

function handleError(res: Response, error: Error) {
  console.error("Error:", error.message);
  return res.status(500).json({ error: "Something went wrong." });
}

// Create a new tables
app.post('/:collection', (req: Request, res: Response) => {
  const { collection } = req.params;
  const data: Schema = req.body;
  console.log(JSON.stringify(data));

  if (!data.tables) {
    handleError(res, new Error('Invalid schema JSON.'));
  }
  createTables(data.tables);
});

// Read a single record by ID
app.get('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;

  db.query<RowDataPacket[]>(`SELECT * FROM ${collection} WHERE id = ?`, [id], (err, results) => {
    if (err) {
      return handleError(res, err);
    }
    if (results.length === 0) {
      return res.status(404).json({ error: `Record with ID ${id} not found.` });
    }
    res.json(results[0]);
  });
});

// Update a record by ID
app.post('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const data = req.body;

  // Check if the ID provided is a valid number
  const recordId = parseInt(id);
  if (isNaN(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'Invalid record ID.' });
  }

  db.query<RowDataPacket[]>(`SELECT * FROM ${collection} WHERE id = ?`, [recordId], (err, results) => {
    if (err) {
      return handleError(res, err);
    }
    if (results.length === 0) {
      return res.status(404).json({ error: `Record with ID ${recordId} not found.` });
    }

    // Perform the update
    const columns = Object.keys(data).join(" = ?, ") + " = ?";
    const values = Object.values(data);
    values.push(recordId);

    db.query(`UPDATE ${collection} SET ${columns} WHERE id = ?`, values, (err) => {
      if (err) {
        return handleError(res, err);
      }
      res.json({ id: recordId, ...data });
    });
  });
});

// Delete a record by ID
app.delete('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;

  // Check if the ID provided is a valid number
  const recordId = parseInt(id);
  if (isNaN(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'Invalid record ID.' });
  }

  db.query<RowDataPacket[]>(`SELECT * FROM ${collection} WHERE id = ?`, [recordId], (err, results) => {
    if (err) {
      return handleError(res, err);
    }
    if (results.length === 0) {
      return res.status(404).json({ error: `Record with ID ${recordId} not found.` });
    }

    // Perform the delete
    db.query(`DELETE FROM ${collection} WHERE id = ?`, [recordId], (err, deleteResult) => {
      if (err) {
        return handleError(res, err);
      }

      // Check if the DELETE query was successful (OkPacket)
      if (deleteResult && 'affectedRows' in deleteResult && deleteResult.affectedRows > 0) {
        res.json({ message: `Record with ID ${recordId} deleted successfully.` });
      } else {
        return handleError(res, new Error('Failed to delete the record.'));
      }
    });
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
