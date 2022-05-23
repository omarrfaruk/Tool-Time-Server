const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bzokc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        const productsCollection = client.db("tool-time").collection('products')
        const orderCollection = client.db("tool-time").collection('orders')
        const reviewCollection = client.db("tool-time").collection('reviews')

        // products collection

        app.get('/product', async (req, res) => {
            const products = await productsCollection.find().toArray()
            res.send(products)
        })


        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const products = await productsCollection.findOne(query)
            res.send(products)
        })

        // order collection

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        });

        app.get('/orders', async (req, res) => {
            const order = await orderCollection.find().toArray()
            res.send(order)
        })

        // reviews collection 

        app.get('/reviews', async (req, res) => {
            const review = await reviewCollection.find().toArray()
            res.send(review)
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })



    } finally {
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})