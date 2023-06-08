const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
class QuadrupleLinkedListNode {
  constructor(data) {
    this.data = data;
    this.prev1 = null;
    this.next1 = null;
    this.prev2 = null;
    this.next2 = null;
  }
}

class QuadrupleLinkedList {
  constructor() {
    this.head1 = null;
    this.head2 = null;
    this.tail1 = null;
    this.tail2 = null;
  }

  append(data) {
    const newNode = new QuadrupleLinkedListNode(data);

    if (!this.head1) {
      this.head1 = newNode;
      this.tail1 = newNode;
    } else {
      this.tail1.next1 = newNode;
      newNode.prev1 = this.tail1;
      this.tail1 = newNode;
    }

    if (!this.head2) {
      this.head2 = newNode;
      this.tail2 = newNode;
    } else {
      this.tail2.next2 = newNode;
      newNode.prev2 = this.tail2;
      this.tail2 = newNode;
    }

    return newNode;
  }
  printMap() {
    console.log("-------------ENTERED PRINT MAP----------");
    let current;
    if(!this.head1){
      current = this.head2;
    }
    else if (!this.head2) {
       current = this.head1;
    }
    console.log("current", current);
    while (current) {
      console.log("current2", current);
      console.log(`Station ID: ${current.data.id}`);
      console.log(`Station Name: ${current.data.stationname}`);
      console.log(`Next 1 Station ID: ${current.next1 ? current.next1.data.id : null}`);
      console.log(`Next 2 Station ID: ${current.next2 ? current.next2.data.id : null}`);
      console.log(`Prev 1 Station ID: ${current.prev1 ? current.prev1.data.id : null}`);
      console.log(`Prev 2 Station ID: ${current.prev2 ? current.prev2.data.id : null}`);
      console.log("------------------------------");
      current = current.next1;
    }
  }
}



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

app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
  try {
    // Get the user information
    const user = await getUser(req);

    // Check if the user is authorized to purchase by subscription
    if (!user || !user.isNormal) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Retrieve the necessary data from the request body
    const { origin, destination, subType, noOfTickets } = req.body;

    // Validate the request body
    if (isEmpty(origin) || isEmpty(destination) || isEmpty(subType) || !noOfTickets) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Retrieve the zone ID based on the origin
    const zone = await db.select("id").from("se_project.zones").where("zonetype", origin).first();
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    // Calculate the price based on the zone and subscription type
    const subscription = await db
      .select("price")
      .from("se_project.zones")
      .where("zonetype", origin)
      .first();

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const totalPrice = subscription.price * noOfTickets;

    // Create a new ticket entry
    const ticket = await db("se_project.tickets").insert({
      origin,
      destination,
      userid: user.id,
      subid: null, // To be updated if purchased by subscription
      tripdate: new Date().toISOString(),
    }).returning("*");

    // Create a new subscription entry
    const subscriptionEntry = await db("se_project.subscription").insert({
      subtype: subType,
      zoneid: zone.id,
      userid: user.id,
      nooftickets: noOfTickets,
    }).returning("*");

    // Update the ticket entry with the subscription ID
    await db("se_project.tickets").where("id", ticket.id).update({ subid: subscriptionEntry.id });

    return res.status(200).json({
      ticket: ticket[0],
      subscription: subscriptionEntry[0],
      totalPrice
    });
  } catch (error) {
    console.error("Error purchasing ticket by subscription:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});







app.get("/api/v1/tickets/price/:originId&:destinationId", async function (req, res) {
  const originId = parseInt(req.params.originId);
  const destinationId = parseInt(req.params.destinationId);
  console.log(originId);
  console.log(destinationId);
  const rows = await db.select(db.raw('COUNT(*)')).from('se_project.stations');
  
  //convert rows to integer
  const NumberOfStations = parseInt(rows[0].count);
  

  const outMatrix=await generateMatrix(NumberOfStations,originId,destinationId);
  const SPPM = floydWarshall(outMatrix); //shortest path matrix
 try{
  const NumberOfPassedStations = SPPM[originId-1][destinationId-1];
  if(NumberOfPassedStations==Infinity){
    return res.status(400).send("There is no route between the two stations");
  }
  const price = NumberOfPassedStations * 5;
  return res.status(200).json(price);


 }
  catch(e){
    console.log(e.message);
    return res.status(400).send("one of your stations is not found");
  }
  


  

});

async function generateMatrix(NumberOfStations) {
  
  const StationsMatrix = [];
  const routes = await db.select("*").from("se_project.routes");


  for (let i = 0; i < NumberOfStations; i++) {
     StationsMatrix[i]= [];
    for (let j = 0; j < NumberOfStations; j++) {
      if(i==j){
        StationsMatrix[i][j] = 0;//distance from a station to itself is 0
      }else{
        StationsMatrix[i][j] = Infinity;
      }

    }
    
  }

  

  
  for (let i = 0; i < NumberOfStations; i++) {
    for (let j = 0; j < NumberOfStations; j++) {
      const Route = routes.find((route) => route.fromstationid === (i + 1) && route.tostationid === (j + 1));

      if (Route) {
        console.log("found route between ",i+1," and ",j+1);
        StationsMatrix[i][j] = 1;
      }
    }
  }

  return StationsMatrix;

  
}


function floydWarshall(StationsMatrix) {
  const n = StationsMatrix.length;
  const dist = [...StationsMatrix];
  

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] !== Infinity && dist[k][j] !== Infinity && dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }

  return dist;
}




};
