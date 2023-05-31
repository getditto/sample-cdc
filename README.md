# Ditto CDC example

Real-time sync changes from a Ditto Big Peer application to external database.

## What is this used for?

Kafka is one way to implement CDC ([Change Data Capture](https://en.wikipedia.org/wiki/Change_data_capture)). The document change stream is a coarse user-consumable Kafka queue that allows you to react to changes made as documents are inserted, updated, or deleted from Ditto's Big Peer. This keeps an external database in sync with Ditto, which can be useful for integration with third-party services and business intelligence tools.

![image](https://user-images.githubusercontent.com/633012/211429728-75f83e47-d9ed-4ab6-91f6-80e3f05b07d6.png)

## Getting started

This is sample code that shows you how to build a small server-side application that acts as a Kafka sink & source between the Ditto Big Peer and an external instance of MongoDB.

#### Prequisites

* An instance of MongoDB.
* Basic understanding of Node.js
* Local installation of [Node 16](https://nodejs.org/en/) (*note: KafkaJS does not work with Node 18 today).
* A Ditto application syncing with the Big Peer on the [Ditto Portal](https://portal.ditto.live/) that is on a dedicated cluster.

#### Usage

1. [Follow the tutorial to enable CDC on your Ditto app](https://docs.ditto.live/ios/common/guides/kafka/intro)
2. See the [nodejs-mongo](nodejs-mongo) directory for example code to connect the Node.js instance to the Ditto Big peer as a Kafka sink to MongoDB.

## License

MIT
