# SLAO Node.js agent

**SLAO is a monitoring and alerting service for Node.js microservices**

[https://slao.io](https://slao.io)

## Installation

Add SLAO to your Node.js application with

> yarn add slao

OR

> npm install slao --save

## Basic Usage

Example

```js
var app = require('express')()
var slao = require('slao').default

//It's important to add slao as the first handler to your express app
app.use(slao.init({
    appName: 'your-app-name', 
    apiKey: '8e38f18a68f1a1a01d2c1dff442ee150e0888bc3dca97048b4000b0d05a28fd0' })
)

app.get('/', function (req, res) {
  res.slao.setTags({ result: 'OK' }) // add a custom tag to your request

  res.send('Hello World!')
})

app.listen(3000)
```

After adding this two lines of code, you'll see every request that your application processes with detailed information about it.

## Slao.init() paramenters

**appName** - name of your application, can be overriden by ```SLAO_APP_NAME``` env variable

**hostname** - name of your host, defaults to ```os.hostname()```, can be overriden by ```SLAO_HOSTNAME``` env variable

**apiKey** - your api key, can be overriden by ```SLAO_API_KEY``` env variable

## Using with Docker

By default when you call ```os.hostname()``` from the inside of a Docker container it returns the container id, not the hostname where you're running the container. To avoid this set ```SLAO_HOSTNAME=<your host name>``` env variable for your docker container using SLAO.

## Custom Tags

You can add custom tags to your requests, you'll be able to filter your data by this tags in SLAO

Example: 

```js
api.get((req, res) => {
    ...
    res.slao.setTags({ result: 'OK' })   
    ...
})

```
