const path = require("path")
const express = require("express")

const srcPath = path.join(__dirname, "../src")
const port = 8888

const app = express()
app.use(express.static(srcPath))

app.listen(port, () => {
    console.log(`Server is running on ${port}`)
})