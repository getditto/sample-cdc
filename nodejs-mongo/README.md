# NodeJS-MongoDB Kafka sink

Sample code for setting up a Kafka sink from Ditto to MongoDB.

## Installation

Install Node 16 [using nvm](https://github.com/nvm-sh/nvm)

```
nvm use 16
npm i
```

## Usage

1. Download the proper `cluster.p12` and `user.p12` files. [See the official Ditto documentation](https://docs.ditto.live/ios/common/guides/kafka/intro#handling-credentials).
2. Set the following environment variables:

* `TOPIC`: The Kafka Topic
* `CLOUD_ENDPOINT`: The Kafka endpoint
* `DATABASE_NAME`: The MongoDB database name
* `MONGO_CONNECTION_URI`: The MongoDB connection URI

3. Once the environment variables are set, convert the .p12 files to the required `user.key`, `cluster.crt`, and `user.crt` files:

```
❯ openssl pkcs12 -in cluster.p12 -out cluster.crt.pem -nokeys
❯ openssl x509 -in cluster.crt.pem -out cluster.crt
❯ openssl pkcs12 -in user.p12 -out user.crt -clcerts
❯ openssl pkcs12 -in user.p12 -out user.key.pem -nocerts
❯ openssl pkey -in user.key.pem -out user.key
```

4. Then, run the script:


```
npm run build
node index.js
```

