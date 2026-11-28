const fs = require('node:fs');
const path = require('node:path');
const { RDSDataClient, ExecuteStatementCommand } = require('@aws-sdk/client-rds-data');

const clientOptions = { region: process.env.AWS_REGION };

if (process.env.AWS_ENDPOINT_URL) {
  clientOptions.endpoint = process.env.AWS_ENDPOINT_URL;
}

const client = new RDSDataClient(clientOptions);

const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');

const statements = schema
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const migrate = async () => {
  for (const sql of statements) {
    await client.send(
      new ExecuteStatementCommand({
        resourceArn: process.env.DB_CLUSTER_ARN,
        secretArn: process.env.DB_SECRET_ARN,
        database: process.env.DB_NAME,
        sql,
      })
    );

    console.log(`applied: ${sql.replace(/\s+/g, ' ')}`);
  }

  console.log(`migration complete: ${statements.length} statement(s)`);
};

migrate().catch((error) => {
  console.error(`migration failed: ${error.message}`);
  process.exit(1);
});
