import express from "express"

const PORT=process.env.PORT || 8080;

const app=express()

app.get("/",(req,res)=>{
    res.send(
        'Healthy server 8080'
    )
})

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})