const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;

// middleware 
app.use(express.json());
app.use(cors());
const stripe = require('stripe')(process.env.VITE_Payment_Gateway_SK)


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@bistro-boss-cluster.ybeduom.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const jwtVerify = async (req, res, next) => {
    const token = req.headers.authorization;
    // console.log(token)
    // console.log('token : ', token);
    if (!token) {
        console.log('token error', token)
        return res.status(401).send({ error: 'Unauthorized user without token!' })
    }
    const jwtToken = token.split(' ')[1];
    // console.log('jwt token :', jwtToken);
    jwt.verify(jwtToken, process.env.JWT_SecretKey, function (err, decoded) {
        if (err) {
            // console.log(err)
            return res.status(401).send({ error: 'Unauthorized user with wrong token!' })
        } else {
            req.decoded = decoded;
            next()
        }
        ;
    })
}

async function run() {
    try {
        await client.connect();

        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewCollection = client.db("bistroDb").collection("reviews");
        const cartCollection = client.db('bistroDb').collection("carts");
        const userCollection = client.db('bistroDb').collection("users");
        const contactCollection = client.db('bistroDb').collection("contacts");
        const paymentCollection = client.db('bistroDb').collection('payments');

        // verify admin 
        // verifyJWT must be used before verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (!user || user?.role !== "Admin") {
                return res.status(403).send({ error: true, message: 'Unauthorized User access: not an admin!' });
            } else {
                next()
            };
        }
        // carts apis
        app.get('/carts', jwtVerify, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.send([]);
            }
            if (req.decoded?.email !== email) {
                return res.status(403).send({ error: true, message: "Forbidden Access" });
            }
            const query = { email: email };
            const carts = await cartCollection.find(query).toArray();
            res.send(carts);
        })
        // 
        app.post('/carts', jwtVerify, async (req, res) => {
            const data = req.body;
            const result = await cartCollection.insertOne(data);
            res.send(result);
        })
        // 
        app.delete('/carts/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            // console.log("id", id)
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query)
            res.send(result);
        })

        // menu apis
        app.get('/menu', async (req, res) => {
            const menu = await menuCollection.find({}).toArray();
            res.send(menu);
        })
        app.post('/menu', jwtVerify, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.send(result);
        })
        app.delete('/menu/:id', jwtVerify, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: { $in: [new ObjectId(id), id] } };
            const result = await menuCollection.deleteOne(query);
            // console.log(result)
            res.send(result);
        })
        app.patch('/menu/:id', jwtVerify, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const item = req.body;
            const query = { _id: { $in: [new ObjectId(id), id] } };
            const result = await menuCollection.updateOne(query, { $set: item });
            // console.log(result)
            res.send(result);

        })

        // review apis
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find({}).toArray();
            res.send(reviews);
        })

        // user apis
        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log({ user })
            const isExist = await userCollection.findOne({ email: user?.email });
            if (isExist) {
                // console.log({ isExist })
                return res.send({ message: 'User already exists' })
            } else {
                const result = await userCollection.insertOne(user);
                // console.log({ result })
                res.send(result);
            }
        })
        app.get('/users', jwtVerify, verifyAdmin, async (req, res) => {
            const result = await userCollection.find({}).toArray();
            res.send(result);
        })
        // checking google login user either exists in the database or not
        app.get('/users/checkUser', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            // console.log(user);
            const result = user ? true : false;
            // console.log({ result });
            res.send({ user: result })
        })
        // updating user to admin  status
        app.patch('/users/admin/:id', jwtVerify, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = { $set: { role: "Admin" } }
            const result = await userCollection.updateOne(filter, updateDoc)
            // console.log("result", result)
            res.send(result);
        })
        // , jwtVerify, verifyAdmin
        app.delete('/users/admin/:id', jwtVerify, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(filter)
            // console.log("result", result)
            res.send(result);
        })

        // admin check
        // jwt verify 
        // checking same user or not 
        app.get('/users/admin/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const result = await userCollection.findOne(query);
            const isAdmin = result?.role === 'Admin' ? true : false;
            // console.log(isAdmin, result);
            res.send({ admin: isAdmin });
        })

        // contact collection
        app.post('/contact', jwtVerify, async (req, res) => {
            const email = req.decoded.email;
            const data = req.body;
            // console.log(data);
            // const 
            if (data.email !== email) {
                return res.status(403).send({ message: 'Provide same email!' })
            }
            const result = await contactCollection.insertOne(data)
            res.send(result)
        })
        app.get("/contact", jwtVerify, verifyAdmin, async (req, res) => {
            const result = await contactCollection.find({}).toArray();
            res.send(result)
        })
        app.delete('/contact/:id', jwtVerify, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const result = await contactCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        // payment apis
        // create payment intent 
        app.post('/create-payment-intent', jwtVerify, async (req, res) => {
            const price = req.body.price;
            const amount = price * 100; // prices are here count in amount of paisa not tk
            // console.log(amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            // console.log(paymentIntent);
            res.send({ clientSecret: paymentIntent.client_secret });
        })
        app.get('/payment', jwtVerify, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.send({})
            }
            if (req.decoded.email !== email) {
                return res.status(403).send({ error: true, message: "Unauthorized user!" })
            }
            const result = await paymentCollection.find({ email: email }).toArray();
            // console.log(result)
            res.send(result);
        })
        app.post('/payment', jwtVerify, async (req, res) => {
            const data = req.body;
            // console.log(data);
            const insertResult = await paymentCollection.insertOne(data);
            if (insertResult.acknowledged) {
                const query = { _id: { $in: data.cartItems?.map(id => new ObjectId(id)) } }
                const deleteResult = await cartCollection.deleteMany(query);
                return res.send({ insertResult, deleteResult });
            }
            res.send({})
        })
        // getting admin statistics 
        app.get('/admin-stats', jwtVerify, verifyAdmin, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(401).send({ error: true, message: 'Invalid email address' })
            }
            if (email !== req.decoded.email) {
                return res.status(403).send({ error: true, message: 'Unauthorized user access!' })
            }
            const customers = await userCollection.estimatedDocumentCount();
            const products = await menuCollection.estimatedDocumentCount();
            const paymentDetails = await paymentCollection.aggregate([
                {
                    $group: {
                        _id: 'null',
                        total: { $sum: "$price" },
                        orders: { $sum: 1 }
                    }
                }
            ]).toArray();
            const { total: revenue, orders } = paymentDetails[0];
            const paymentGraph = [
                {
                    $lookup: {
                        from: 'menu',
                        localField: 'menuItems',
                        foreignField: '_id',
                        as: 'menuOrderItems'
                    }
                },
                {
                    $unwind: "$menuOrderItems"
                },
                {
                    $group: {
                        _id: '$menuOrderItems.category',
                        total: { $sum: "$menuOrderItems.price" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        category: '$_id',
                        _id: 0,
                        total: 1,
                        count: 1
                    },
                },
            ]
            const completedOrders = await paymentCollection.aggregate(paymentGraph).toArray();

            // console.log(customers, products, revenue, orders, completedOrders)
            res.send({ customers, products, revenue, orders, completedOrders })
        })
        // getting user statistics
        app.get('/user-stats', jwtVerify, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(401).send({ error: true, message: 'Invalid email address' })
            }
            if (email !== req.decoded.email) {
                return res.status(403).send({ error: true, message: 'Unauthorized user access!' })
            }
            const menu = await menuCollection.estimatedDocumentCount();
            const review = (await reviewCollection.find({ email: email }).toArray()).length;
            const payment = (await paymentCollection.find({ email: email }).toArray()).length;

            // console.log("from stats", review, payment, menu);
            res.send({ review, payment, menu })
        })

        // jwt sign in
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const jwtToken = jwt.sign(user, process.env.JWT_SecretKey, { expiresIn: '2d' });
            // console.log(jwtToken);
            res.send({ token: jwtToken });
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

// TODO: make all error message more professional without full description.