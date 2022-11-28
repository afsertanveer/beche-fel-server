const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;
const app = express();

//DB_PASS=ICRw1DNG3tOhHcYl
//DB_USER=becheFel
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gt8bmu9.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const usersCollection = client.db("becheFel").collection("users");
    const categoriesCollection = client.db("becheFel").collection("categories");
    const productsCollection = client.db("becheFel").collection("products");
    const bookedCollection = client.db("becheFel").collection("booked");
    const paymentsCollection = client.db("becheFel").collection("payments");
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      next();
    };

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "12h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const result = await paymentsCollection.insertOne(payment);
        const prodId = payment.productId;
        const secFilter = { _id: ObjectId(prodId) };
        const updatedDocProd = {
          $set: {
            isSold: "true",
          },
        };
        const prodBook = await productsCollection.updateOne(
          secFilter,
          updatedDocProd
        );
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: "true",
          transactionId: payment.transactionId,
        },
      };
      const updateResult = await bookedCollection.updateOne(
        filter,
        updatedDoc
      );
    
      res.send(result);
    });
    //add users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    //delete a user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });
    //show all users
    app.get("/users", async (req, res) => {
      let query = {};
      const role = req.query.role;
      if (role) {
        query = { role: role };
      }
      const email = req.query.email;
      if (email) {
        query = { email: email };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //send user role
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.role });
    });

    //verifying user
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          isVerified: "true",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    //show categories

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    //add a product

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    //show products
    app.get("/products", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { addedBy: email };
      }
      const isReported = req.query.isReported;
      if (isReported) {
        query = { isReported: isReported };
      }
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    //delete a product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });
    //get product by category
    app.get("/products/:name", async (req, res) => {
      const name = req.params.name;
      const query = { brand: name };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    //update products when advertised
    app.put("/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          isAdvertised: "true",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    //report product
    app.put("/products/report/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          isReported: "true",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    //bookedPhone
    app.post("/bookedPhone", async (req, res) => {
      const booked = req.body;
      if (booked.productId) {
        const query = { _id: ObjectId(booked.productId) };
        const option = { upsert: true };
        const updatedDoc = {
          $set: {
            booked: "true",
          },
        };

        const result = await productsCollection.updateOne(
          query,
          updatedDoc,
          option
        );
      }
      const result = await bookedCollection.insertOne(booked);

      res.send(result);
    });

    //get all booked
    app.get("/bookedPhone", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { email: email };
      }
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    });
    //get booked by id
    app.get("/bookedPhone/:id", async (req, res) => {
      const id = req.params.id;
      let query = {productId:id};
      const result = await bookedCollection.findOne(query);
      res.send(result);
    });

  } finally {
  }
}

run().catch(console.log());


app.get("/", async (req, res) => {
  res.send("Beche Fel server is running");
});
app.listen(port, () => {
  console.log(`Beche Fel is running on ${port}`);
});


