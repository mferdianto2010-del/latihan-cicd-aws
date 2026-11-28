const { RDSDataClient, ExecuteStatementCommand } = require('@aws-sdk/client-rds-data');

const clientOptions = { region: process.env.AWS_REGION };

if (process.env.AWS_ENDPOINT_URL) {
  clientOptions.endpoint = process.env.AWS_ENDPOINT_URL;
}

const client = new RDSDataClient(clientOptions);

const COLUMNS =
  "id, name, content_type, size_bytes, s3_key, to_char(created_at at time zone 'utc', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as created_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const value = (field) => {
  if (!field || field.isNull) return null;

  if (field.stringValue !== undefined) return field.stringValue;

  if (field.longValue !== undefined) return field.longValue;

  return undefined;
};

const toItem = (record) => ({
  id: value(record[0]),
  name: value(record[1]),
  contentType: value(record[2]),
  size: value(record[3]),
  s3Key: value(record[4]),
  createdAt: value(record[5]),
});

const exec = (sql, parameters = []) =>
  client.send(
    new ExecuteStatementCommand({
      resourceArn: process.env.DB_CLUSTER_ARN,
      secretArn: process.env.DB_SECRET_ARN,
      database: process.env.DB_NAME,
      sql,
      parameters,
    })
  );

const isId = (candidate) => UUID.test(candidate);

const list = async () => ((await exec(`select ${COLUMNS} from files order by created_at desc`)).records || []).map(toItem);

const find = async (id) => {
  const response = await exec(`select ${COLUMNS} from files where id = cast(:id as uuid)`, [
    { name: 'id', value: { stringValue: id } },
  ]);

  const record = (response.records || [])[0];

  return record ? toItem(record) : null;
};

const insert = async (file) => {
  const response = await exec(
    `insert into files (id, name, content_type, size_bytes, s3_key) values (cast(:id as uuid), :name, :contentType, :size, :s3Key) returning ${COLUMNS}`,
    [
      { name: 'id', value: { stringValue: file.id } },
      { name: 'name', value: { stringValue: file.name } },
      { name: 'contentType', value: { stringValue: file.contentType } },
      { name: 'size', value: { longValue: file.size } },
      { name: 's3Key', value: { stringValue: file.s3Key } },
    ]
  );

  return toItem((response.records || [])[0]);
};

const remove = async (id) => {
  const response = await exec('delete from files where id = cast(:id as uuid) returning s3_key', [
    { name: 'id', value: { stringValue: id } },
  ]);

  const record = (response.records || [])[0];

  return record ? value(record[0]) : null;
};

module.exports = { isId, list, find, insert, remove };
