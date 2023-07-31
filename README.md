# DotCards

## API Endpoints

### Create Table
Suppose you have a sample-schema.json file, and it includes the primary key 'id' and other followings columns:
```json
{
	"columns": [{
			"name": "id",
			"type": "int",
			"isPrimaryKey": true
		},
		{
			"name": "name",
			"type": "varchar(50)"
		},
		{
			"name": "email",
			"type": "varchar(100)"
		}
	]
}
```
Send create requests like: `curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d @sample-schema.json`

### Update Row
If record exists, do upsert. Otherwise do insert.
Suppose you have a sample-insert.json file:
```json
{
    "name": "test-user",
    "email": "test-user@email.com"
}
```
Send update request like: `curl -X POST http://localhost:3000/users/0 -H "Content-Type: application/json" -d @src/sample-insert.json`


### Get Row
Suppose you want to get the row from `users` table with id 0:

Send get request like:`curl http://localhost:3000/users/0 `

### Delete Row
Suppose you want to delete the row from `users` table with id 0:

Send delete request like:`curl -X DELETE http://localhost:3000/users/0 `
