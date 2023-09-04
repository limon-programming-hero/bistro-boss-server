const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewCollection = client.db("bistroDb").collection("reviews");
        const cartCollection = client.db('bistroDb').collection("carts");
        const userCollection = client.db("bistroDb").collection('users');

        // carts apis

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            if (!email) {
                res.send([]);
            }
            const carts = await cartCollection.find(query).toArray();
            res.send(carts);
        })

        app.post('/carts', async (req, res) => {
            const data = req.body;
            const result = await cartCollection.insertOne(data);
            res.send(result);
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            console.log("id", id)
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query)
            res.send(result);
        })


        // menu apis
        app.get('/menu', async (req, res) => {
            const menu = await menuCollection.find({}).toArray();
            res.send(menu);
        })

        // review apis
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find({}).toArray();
            res.send(reviews);
        })

        // User APIS
        app.get('/users', async (req, res) => {
            const users = await userCollection.find({}).toArray();
            res.send(users);
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            console.log(user);
            res.send(result)
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


// ----------------------All API naming conventions--------------------

// ------------------------------for carts-----------------------------

// app.get('/carts') using specified email by query
// app.post('/carts') using body section
// app.delete('/carts/:id')


//  ----------------------------- for all users-------------------------

// app.get('/users') {admin can only access}
// app.post('/users') using body section {this will be done by sign up for every user at once}
// app.patch('/users/:id') {admin can only access}
// app.put('/users/:id') {admin can only access}
// app.delete('/users/:id') {admin can only access}