const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000;

// middleware 
app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@bistro-boss-cluster.ybeduom.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const menuData = client.db("bistroDb").collection("menu");
        const reviewData = client.db("bistroDb").collection("reviews");
        const cartData = client.db('bistroDb').collection("carts");

        // carts apis
        app.get('/carts', async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }
            const query = { email: email };
            const result = await cartData.find(query).toArray();
            res.send(result);
        });
        // app.get('/carts', async (req, res) => {
        //     const email = req.query.email;
        //     const query = { email: email }
        //     console.log(email)
        //     const carts = await cartData.find({ email: email }).toArray();
        //     console.log(carts)
        //     res.send(carts);
        // })
        app.post('/carts', async (req, res) => {
            const data = req.body;
            const result = await cartData.insertOne(data);
            res.send(result);
        })


        // menu apis
        app.get('/menu', async (req, res) => {
            const menu = await menuData.find({}).toArray();
            res.send(menu);
        })

        // review apis
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewData.find({}).toArray();
            res.send(reviews);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('welcome to backend')
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})