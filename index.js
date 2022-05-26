const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 4000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { send } = require('process');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const corsConfig = {
    origin: true,
    credentials: true,
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bzokc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'Unauthorized' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Token' })
        }
        req.decoded = decoded;
        console.log(decoded.foo) // bar
        next()
    });
}


async function run() {
    try {
        await client.connect();

        const productsCollection = client.db("tool-time").collection('products')
        const orderCollection = client.db("tool-time").collection('orders')
        const reviewCollection = client.db("tool-time").collection('reviews')
        const usersCollection = client.db("tool-time").collection('users')
        const paymentCollection = client.db("tool-time").collection('payment')


        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });



        // products collection

        app.get('/product', async (req, res) => {
            const products = await productsCollection.find().toArray()
            res.send(products)
        })


        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = {_id:ObjectId(id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })


        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = {_id: ObjectId(id) }
            const products = await productsCollection.findOne(query)
            res.send(products)
        })


        app.post('/product', async (req, res) => {

            const products = req.body;
            const result = await productsCollection.insertOne(products)
            res.send(result)
        })

        // order collection

        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc)
            res.send(updatedDoc)
        })



        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        });



        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.findOne(query)
            res.send(result)
        });

        app.get('/orders', verifyJWT, async (req, res) => {
            const customerEmail = req.query.email;
            const decodeEmail = req.decoded.email;
            if (customerEmail === decodeEmail) {
                const query = { customerEmail: customerEmail }
                const order = await orderCollection.find(query).toArray()
                return res.send(order)
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        })


        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        })


        app.get('/orders/admin', async (req, res) => {
            const allOrders = await orderCollection.find().toArray()
            res.send(allOrders)
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


        //user collections

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ result, token });
        })



        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })



        app.get('/user', async (req, res) => {
            const email = req.headers.email;
            const user = await usersCollection.findOne({ email: email })
            res.send(user)
        })

        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const applied = req.decoded.email;
            const appliedAccount = await usersCollection.findOne({ email: applied })
            if (appliedAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }

        })



        app.get('/users', verifyJWT, async (req, res) => {
            const user = await usersCollection.find().toArray()
            res.send(user)
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