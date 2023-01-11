import { Kafka, CompressionTypes, CompressionCodecs, logLevel } from 'kafkajs';
import * as fs from 'fs';
import { Db, MongoClient } from 'mongodb';
import axios from 'axios';
import LZ4Codec from 'kafkajs-lz4';

CompressionCodecs[CompressionTypes.LZ4] = new LZ4Codec().codec;

const topic = process.env.TOPIC || '';
const kafkaHost =  process.env.CLOUD_ENDPOINT || ''
const httpEndpoint =  process.env.HTTP_ENDPOINT || '';;
const dbName = process.env.DATABASE_NAME || '';
const yourConnectionURI = process.env.MONGO_CONNECTION_URI || '';

const kafka = new Kafka({
  clientId: 'my-consumer',
  brokers: [kafkaHost],
  ssl: {
    rejectUnauthorized: false,
    key: fs.readFileSync("./user.key", "utf-8"),
    cert: fs.readFileSync("./user.crt", "utf-8"),
    ca: fs.readFileSync("./cluster.crt", "utf-8"),
  }
});

const consumer = kafka.consumer({ groupId: topic });

interface DittoEvent {
  type: 'requeryRequired' | 'documentChanged'
  txnId: string,
  version: number,
  isBase64Encoded: boolean,
}

interface DittoTransaction extends DittoEvent {
  change: DittoInsert | DittoUpdate | DittoRemove,
  collection: string,
  type: 'documentChanged'
}

interface RequeryRequiredDocument {
  appId: string,
  collectionName: string,
  documentId: string
}

interface DittoRequeryRequired extends DittoEvent {
  txnId: string,
  version: number,
  type: 'requeryRequired'
  documents: RequeryRequiredDocument[],
}

interface DittoInsert {
  method: 'upsert',
  oldValue: null,
  newValue: Document
}

interface DittoUpdate {
  method: 'upsert',
  oldValue: Document,
  newValue: Document
}

interface DittoRemove {
  method: 'remove',
  value: Document
}

interface DittoHTTPDocument {
  id: string,
  fields: any
}

interface Document {
  _id: any, // _id is a string in Ditto, but in Mongo it's typed as ObjectId so we leave it any here
  [key: string]: any;
}

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: topic, fromBeginning: true });
  const client = new MongoClient(yourConnectionURI);

  await client.connect();

  const database = client.db(dbName);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received message from topic ${topic} and partition ${partition}: ${message.value}`);

      let change = message.value
      if (!change) {
        console.error("[ERROR] Change is null, not inserting into mongo: ", message)
        return
      }

      try {
        const transaction = JSON.parse(message.value!.toString())
        console.log('Got transaction', transaction)
        parseTransaction(database, transaction).then(() => {

        }).catch(err => {
          console.error('[ERROR] Got error when parsing transaction', err)
        })
        } catch (err) {
          console.error("[ERROR]: Failed to parse change", change)
        }
      }
    });
}

run().catch(console.error);

function onRequeryRequired (database: Db, transaction: DittoRequeryRequired) {
  const HTTP_ENDPOINT = httpEndpoint + '/api/v3/store/find'
  for (const requeryDoc of transaction.documents) {
    const req = {
      method: 'post',
      url: HTTP_ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
        'X-DITTO-TXN-ID': transaction.txnId
      }, 
      data: {
        "collection": transaction,
        "query": "true",
        "limit": 1
      }
    }
    
    axios(req).then(function (response) {
      if (response.data.message) {
        // ERROR
        console.error(`[ERROR]: HTTP find request ${req} returned error with message: ${response.data.message}`)
      } else {
        for (const doc of response.data.documents) {
          const mongodbCollection = database.collection(requeryDoc.collectionName);
          let missingDocument = doc as DittoHTTPDocument 
          mongodbCollection.replaceOne({_id: missingDocument.id}, missingDocument)
        }
      }
    }).catch(err => {
      console.error(`[ERROR]: HTTP find request ${req}`)
      console.error(err)
    });

  }
}

async function parseTransaction (database: Db, event: DittoEvent) {

  switch (event.type) {
    case 'requeryRequired':
      onRequeryRequired(database, event as DittoRequeryRequired)
      return;
    case 'documentChanged':
      const transaction = event as DittoTransaction
      const collection = database.collection(transaction.collection);
      switch (transaction.change.method) {
        case 'upsert':
          if (transaction.change.oldValue == null) {
            let change: DittoInsert = transaction.change
            const result = await collection.insertOne(change.newValue);
            console.log(
              `A document was inserted with the _id: ${result.insertedId}`,
            );
          } else {
            let change: DittoUpdate = transaction.change
            const _id = change.oldValue._id
            const filter = { _id };
            const result = await collection.replaceOne(filter, change.newValue, {upsert: true});
            console.log(
              `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
            );}
          break;
        case 'remove':
          let change: DittoRemove = transaction.change
          const _id = transaction.change.value._id
          const filter = { _id };
          const result = await collection.deleteOne(filter)
          console.log(
            `${result.deletedCount} document(s) matched the filter`,
          );
          break;
      }
    default: 
      throw new Error('[ERROR] Event did not match requeryRequired or documentChanged ' + event)
      break;
  }
}
