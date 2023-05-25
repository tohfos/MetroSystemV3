const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user)
  return user;
};

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });

  app.post("/api/v1/station",async function(req,res){
 
    const {stationname}=req.body;
    if(!stationname){
      return res.status(400).send("name is required");
    }
    
    const user = await getUser(req);
    if(!user.isAdmin){
      return res.status(401).send("Unauthorized");
    }
    const newStation={
      stationname:stationname,
      stationtype:"normal",
      stationstatus:"new"
      
      
    }
    try{
      const station=await db("se_project.stations").insert(newStation).returning("*");
      
      return res.status(200).json("added new station with the name : ",newStation.stationname);

    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not create station");
    }
  });


  app.put("/api/v1/station/:stationId",async function(req,res){
     
    const {stationname}=req.body;
    if(!stationname){
      return res.status(400).send("name is required");
    }
    //check user authenticity
    const user = await getUser(req);
    if(!user.isAdmin){
      return res.status(401).send("Unauthorized");
    }

    //get the station from the database using the stationId
    const stationId=req.params.stationId;
    const station=await db.select("*").from("se_project.stations").where("id",stationId).first();
    if(isEmpty(station)){
      return res.status(404).send("Station not found");
    }


    
    
    const newStation={
      stationname:stationname,
      
      
      
    }
    try{
      const station=await db("se_project.stations").update(newStation).where("id",stationId).returning("*");
      
      return res.status(200).json("updated station name");

    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not update station");
    }



  });



  app.put("/api/v1/requests/senior/:requestId",async function(req,res){
     
    // check for authenticity since only the admin can accept and reject requests

    const user = await getUser(req);
    if(!user.isAdmin){
      return res.status(401).send("Unauthorized");
    }
   // after authenticity check, admin can now view the request
   const requestId=req.params.requestId;
   const request=await db.select("*").from("se_project.senior_requests").where("id",requestId).first();
   if(isEmpty(request)){
     return res.status(404).send("request not found");
   }
   //admin can now accept or reject the request
    const {seniorstatus}=req.body;
    if(!seniorstatus){
      return res.status(400).send("senior status is required"); //in case admin forgets to add the senior status
    }
    
    
    

    const newStatus = {
      status : req.body.seniorstatus
    }

    try{
      const request=await db("se_project.senior_requests").update(newStatus).where("id",requestId).returning("*");
      
      
      return res.status(200).json("updated senior status");

    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not update senior status");
    }

  });


app.put("/api/v1/requests/refunds/:requestId",async function(req,res){

  // check for authenticity since only the admin can accept and reject requests

  const user = await getUser(req);
  if(!user.isAdmin){
    return res.status(401).send("Unauthorized");
  }
 // after authenticity check, admin can now view the request
 const requestId=req.params.requestId;
 const request=await db.select("*").from("se_project.refund_requests").where("id",requestId).first();
 if(isEmpty(request)){
   return res.status(404).send("request not found");
 }

//validate if the ticket is valid
const ticketId=request.ticketid;
const ticket=await db.select("*").from("se_project.tickets").where("id",ticketId).first();
if(isEmpty(ticket)){
  return res.status(404).send("ticket not found");
}
//validate if the ticket belongs to the user


 //admin can now accept or reject the request
  const {refundstatus}=req.body;
  if(!refundstatus){
    return res.status(400).send("refund status is required"); //in case admin forgets to add the refund status
  }
  
  const newStatus = {
    status : req.body.refundstatus
  }

  try{
    const request=await db("se_project.refund_requests").update(newStatus).where("id",requestId).returning("*");
    
    
    return res.status(200).json("updated refund status");

  }catch(e){
    console.log(e.message);
    return res.status(400).send("Could not update refund status");
  }


});
  
};
