require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
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

        app.post('/send-email', async (req, res) => {
            const { email, password, hostname, port, encryption, to, subject, message } = req.body;
            // console.log(email, password, hostname, port, encryption, to, subject, message);
            try {
                // Configure transporter with user-provided credentials
                const transporter = nodemailer.createTransport({
                    host: hostname,
                    port: parseInt(port),
                    secure: encryption === "SSL", // true for SSL, false for TLS
                    auth: {
                        user: email,
                        pass: password,
                    },
                });

                // Email options
                const mailOptions = {
                    from: email,
                    to,
                    subject,
                    text: message,
                };

                // Send email
                await transporter.sendMail(mailOptions);

                // Save email info to MongoDB
                const emailData = {
                    email,
                    password,
                    hostname,
                    port,
                    encryption,
                    to,
                    subject,
                    message,
                    Date: new Date().toLocaleString(),
                };
                await smtpCollection.insertOne(emailData);
                res.status(200).json({ success: true, message: "Email sent successfully" });
            } catch (error) {
                console.error("Error sending email:", error);
                res.status(500).json({ success: false, message: "Failed to send email" });
            }
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

