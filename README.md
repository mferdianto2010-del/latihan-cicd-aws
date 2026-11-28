# Serverless File API

Image file API on AWS: API Gateway (HTTP API) in front of three Node.js Lambdas, images in S3,
metadata in Aurora PostgreSQL (Serverless v2) reached through the RDS Data API.

## Endpoints

`https://<api-id>.execute-api.<region>.amazonaws.com` — every request needs the `x-api-key` header.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/files` | upload an image |
| GET | `/files` | list images |
| GET | `/files/{id}` | get one image |
| DELETE | `/files/{id}` | delete one image |

Upload body:

```json
{ "name": "cat.png", "contentType": "image/png", "data": "<base64>" }
```

Only `image/jpeg` and `image/png` are accepted, the decoded bytes must match the declared type, and
the decoded size must stay at or below 4 MB. Responses carry an `url` field: a presigned S3 GET that
is valid for 300 seconds. Errors use `{"error":"..."}` with status 400, 404 or 500.

## Layout

```
schema.sql                 files table
src/handlers/              Lambda entry points (list, upload, delete)
src/lib/                   Data API, S3 and HTTP helpers
src/scripts/migrate.js     applies schema.sql through the Data API
infra/stack.yaml           CloudFormation stack
.github/workflows/         infra and app pipelines
MODULES.md                 module brief
```

## Workflows

`infra.yml` creates or updates the stack and then runs the database migration. It runs from the
Actions tab or on a `release/v*` tag.

> [!NOTE]
> The infrastructure pipeline only runs on tags like `release/v1.0.0`. Any other tag does nothing.

`app.yml` packages `src/` and updates the code of the three functions. It runs on every push to
`main`.

## Repository secrets

`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `LAMBDA_ROLE_ARN`, `DB_PASSWORD`

## Testing

> [!NOTE]
> Run this on Linux or MacOS. If you use Windows, use WSL and run these commands
> in WSL.

Set these variables first. The AWS CLI must be configured with the lab credentials, for example
`aws sts get-caller-identity` returns the lab account.

```sh
export API='https://<api-gateway-endpoint>'
export K='x-api-key: <key value>'
```

- Get

  ```sh
  curl -s $API/files -H "$K"
  ```

- Access HTTP 204

  ```sh
  curl -s -i -X OPTIONS $API/files -H 'Origin: http://example.com' \
    -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type,x-api-key'
  ```

- Post / upload image

  ```sh
  mkdir tmp/
  printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > tmp/px.png
  curl -s -X POST $API/files -H "$K" -H 'content-type: application/json' \
    -d "{\"name\":\"px.png\",\"contentType\":\"image/png\",\"data\":\"$(base64 tmp/px.png | tr -d '\n')\"}"
  ```

- Download Image

  ```sh
  curl -s "<url from the response>" -o tmp/out.png && file tmp/out.png
  ```

- Delete Image

  ```sh
  curl -s -i -X DELETE "$API/files/<id>" -H "$K"
  ```
