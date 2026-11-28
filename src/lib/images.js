const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { httpError } = require('./http');

const clientOptions = { region: process.env.AWS_REGION };

if (process.env.AWS_ENDPOINT_URL) {
  clientOptions.endpoint = process.env.AWS_ENDPOINT_URL;
  clientOptions.forcePathStyle = true;
}

const client = new S3Client(clientOptions);

const TYPES = {
  'image/png': { extension: 'png', magic: '89504e470d0a1a0a' },
  'image/jpeg': { extension: 'jpg', magic: 'ffd8ff' },
};

const MAX_BYTES = 4 * 1024 * 1024;

const decode = (contentType, data) => {
  const type = TYPES[contentType];

  if (!type) throw httpError(400, 'contentType must be image/jpeg or image/png');

  if (data.length === 0) throw httpError(400, 'data must be a base64 string');

  const bytes = Buffer.from(data, 'base64');

  if (bytes.length > MAX_BYTES) throw httpError(400, 'image exceeds 4 MB');

  const magic = Buffer.from(type.magic, 'hex');

  if (!bytes.subarray(0, magic.length).equals(magic)) throw httpError(400, 'data does not match contentType');

  return { bytes, extension: type.extension };
};

const put = async (key, bytes, contentType) => {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.IMAGES_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );

  return key;
};

const presign = (key) =>
  getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.IMAGES_BUCKET, Key: key }), { expiresIn: 300 });

const remove = (key) => client.send(new DeleteObjectCommand({ Bucket: process.env.IMAGES_BUCKET, Key: key }));

module.exports = { decode, put, presign, remove };
