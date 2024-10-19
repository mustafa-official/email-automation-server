require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 5000;


//middleware
const corsOptions = {
    origin: [
        "http://localhost:5173"
    ],
    credentials: true,
    optionSuccessStatus: 200,

}
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.elzgrcu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const smtpCollection = client.db("emailAutomationDB").collection("smtp");
        const customerCollection = client.db("emailAutomationDB").collection("customers");
        const campaignCollection = client.db("emailAutomationDB").collection("campaign");


        app.post("/send-email/:id", async (req, res) => {
            const { id } = req.params;

            try {
                // Find campaign by ID
                const campaign = await campaignCollection.findOne({ _id: new ObjectId(id) });
                if (!campaign) return res.status(404).json({ message: "Campaign not found" });

                const { smtpEmail, subject, message, fromName, customerEmail } = campaign;

                // Find SMTP credentials by email
                const smtpInfo = await smtpCollection.findOne({ email: smtpEmail });
                if (!smtpInfo) return res.status(404).json({ message: "SMTP credentials not found" });

                const { email, password, hostname, port, encryption } = smtpInfo;

                // Configure Nodemailer transporter
                const transporter = nodemailer.createTransport({
                    host: hostname,
                    port: parseInt(port),
                    secure: encryption === "SSL", // true for SSL, false for TLS
                    auth: { user: email, pass: password },
                });

                // Email options
                const mailOptions = {
                    from: `"${fromName}" <${email}>`,
                    to: customerEmail,
                    subject,
                    text: message,
                };

                // Send email
                await transporter.sendMail(mailOptions);

                // Update campaign status to "active"
                const updatedDoc = {
                    $set: { status: "active" },
                };
                await campaignCollection.updateOne(
                    { _id: new ObjectId(id) },
                    updatedDoc
                );


                res.status(200).json({ success: true, message: "Email sent and status updated successfully!" });
            } catch (error) {
                console.error("Error sending email:", error);
                res.status(500).json({ success: false, message: "Failed to send email" });
            }
        });


        app.post("/create-smtp", async (req, res) => {
            const smtpInfo = req.body;
            const result = await smtpCollection.insertOne(smtpInfo);
            res.send(result);
        })

        //get email who sender
        app.get("/smtp-email", async (req, res) => {
            const result = await smtpCollection.find().toArray();
            res.send(result);
        })

        // Get a single email by ID
        app.get("/smtp-email/:id", async (req, res) => {
            const { id } = req.params;
            const result = await smtpCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // update smtp email by ID 
        app.patch("/smtp-update/:id", async (req, res) => {
            const { id } = req.params;
            const updateInfo = req.body;
            const updatedDoc = {
                $set: {
                    ...updateInfo
                }
            }
            const result = await smtpCollection.updateOne({ _id: new ObjectId(id) }, updatedDoc);
            res.send(result);
        })

        // delete smtp email by ID 
        app.delete("/smtp-delete/:id", async (req, res) => {
            const { id } = req.params;
            const result = await smtpCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        //create customer
        app.post("/create-customer", async (req, res) => {
            const customer = req.body;
            const result = await customerCollection.insertOne(customer);
            res.send(result);
        })

        //get all customer
        app.get("/customers", async (req, res) => {
            const result = await customerCollection.find().toArray();
            res.send(result);
        })

        //create campaign
        app.post("/create-campaign", async (req, res) => {
            const campaignInfo = req.body;
            const result = await campaignCollection.insertOne(campaignInfo);
            res.send(result);
        })

        //get all customer
        app.get("/all-campaign", async (req, res) => {
            const result = await campaignCollection.find().toArray();
            res.send(result);
        })

        //update status from campaign
        app.patch("/update-status/:id", async (req, res) => {
            const { id } = req.params;
            const updatedDoc = {
                $set: {
                    status: "active"
                }
            }
            const result = await campaignCollection.updateOne({ _id: new ObjectId(id) }, updatedDoc);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.listen(port, () => {
    console.log(`Port running is ${port}`);
})

