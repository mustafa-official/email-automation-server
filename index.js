require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: [
        "http://localhost:5173"
    ],
    credentials: true,
    optionSuccessStatus: 200,

}


app.use(cors(corsOptions));
app.use(express.json());




app.listen(port, () => {
    console.log(`Port running is ${port}`);
})

