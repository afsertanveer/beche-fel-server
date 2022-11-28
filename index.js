const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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
async function run() {
  try {

    const usersCollection = client.db('becheFel').collection('users');
    const categoriesCollection = client.db('becheFel').collection('categories');
    const productsCollection = client.db("becheFel").collection("products");

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

    //add users
       app.post("/users", async (req, res) => {
         const user = req.body;
         const result = await usersCollection.insertOne(user);
         res.send(result);
       });
    //show all users
       app.get('/users',async(req,res)=>{
        const query={};
        const result = await usersCollection.find(query).toArray();
        res.send(result);
       })

    //send user role
      app.get("/users/role/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send({ role: user?.role });
      });
      
      //show categories
      
      app.get('/categories',async(req,res)=>{
        const query ={};
        const result = await categoriesCollection.find(query).toArray();
        res.send(result);
      })

      //add a product

      app.post('/products',async(req,res)=>{
          const product = req.body;
          const result = await productsCollection.insertOne(product);
          res.send(result);
        
      })

      app.get('/products',async(req,res)=>{
        let query={};
        const email = req.query.email;
        if(email){
          query={addedBy:email};
        }
        const result = await productsCollection.find(query).toArray();
        res.send(result);

      })

      //get product by category
      app.get('/products/:name',async(req,res)=>{
        const name = req.params.name;
        const query = {brand:name};
        const result = await productsCollection.find(query).toArray();
        res.send(result);
      })


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


