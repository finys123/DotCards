// app.ts

import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise'; // Updated import for mysql2
import fs from 'fs';
import { promisify } from 'util';

export const app = express();
const readFileAsync = promisify(fs.readFile);

app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'CustomerDB',
  connectionLimit: 10, // Adjust this as per your needs
});

function validateData(data: any, requiredFields: string[]): string[] {
  const missingFields: string[] = [];
  for (const field of requiredFields) {
    if (!(field in data)) {
      missingFields.push(field);
    }
  }
  return missingFields;
}

export async function createTablesFromSchema(): Promise<void> {
  try {
    const schemaData: string = await readFileAsync('schema.json', 'utf8');
    const schema: Record<string, string> = JSON.parse(schemaData);

    Object.keys(schema).forEach(async (tableName) => {
      const table = schema[tableName];
      const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${table})`;

      try {
        await executeQuery(createTableQuery);
        console.log(`Table '${tableName}' created.`);
      } catch (err) {
        console.error(`Error creating table '${tableName}':`, err);
      }
    });
  } catch (err) {
    console.error('Error reading schema file:', err);
  }
}

app.post('/:collection', async (req: Request, res: Response) => {
  const { collection } = req.params;
  const data = req.body;

  const requiredFields = ['name', 'email'];

  const missingFields = validateData(data, requiredFields);
  if (missingFields.length > 0) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missingFields.join(', ')}` });
  }

  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = new Array(keys.length).fill('?').join(', ');
  const insertQuery = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders})`;

  try {
    const result = await executeQuery(insertQuery, values);
    res.json({ success: true, id: result[0].insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error inserting data.' });
  }
});

app.get('/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const selectQuery = `SELECT * FROM ${collection} WHERE id = ?`;

  try {
    const result = await executeQuery(selectQuery, [id]);
    if (result[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }
    res.json({ success: true, data: result[0][0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching data.' });
  }
});

app.put('/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const data = req.body;

  const requiredFields = ['name', 'email'];

  const missingFields = validateData(data, requiredFields);
  if (missingFields.length > 0) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missingFields.join(', ')}` });
  }

  const updateQuery = `UPDATE ${collection} SET ? WHERE id = ?`;

  try {
    await executeQuery(updateQuery, [data, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating data.' });
  }
});

app.delete('/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const deleteQuery = `DELETE FROM ${collection} WHERE id = ?`;

  try {
    const result = await executeQuery(deleteQuery, [id]);
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting data.' });
  }
});

async function executeQuery(query: string, values: any[] = []): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(query, values);
    return result;
  } finally {
    connection.release();
  }
}

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
