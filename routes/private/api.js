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

  app.post("/api/v1/station", async function(req, res) {
    const { stationname } = req.body;
    
    if (!stationname) {
      return res.status(400).send("Name is required");
    }
    
    const user = await getUser(req);
    
    if (!user.isAdmin) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      // Check if a station with the same name already exists
      const existingStation = await db
        .select("*")
        .from("se_project.stations")
        .where("stationname", stationname)
        .first();
        
      if (existingStation) {
        return res.status(409).send("Station with the same name already exists");
      }
      
      await db("se_project.stations")
      .where({ stationposition: "end" })
      .update({ stationposition: "middle" });

      const newStation = {
        stationname: stationname,
        stationposition: "end",
        stationtype: "normal",
        stationstatus: "new"
      };
      
      const insertedStation = await db("se_project.stations")
        .insert(newStation)
        .returning("*");
      
      return res.status(200).json({
        message: "Added new station with the name: " + newStation.stationname,
        station: insertedStation
      });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create station");
    }
  });
  

  app.put("/api/v1/station/0",async function(req,res){
    
    const oldStationName=req.body.oldStationName;
    const newStationName = req.body.newStationName
    
    if(!oldStationName || !newStationName){
      return res.status(400).send("name is required");
    }
    //check user authenticity
    const user = await getUser(req);
    if(!user.isAdmin){
      return res.status(401).send("Unauthorized");
    }

    //get the station from the database using the stationId
  
    const station=await db.select("*").from("se_project.stations").where("stationname",oldStationName).first();
    if(isEmpty(station)){
      return res.status(404).send("Station not found");
    }


    
    
    const newStation={
      stationname:newStationName,
      
      
      
    }
    try{
      const station=await db("se_project.stations").update(newStation).where("stationname",oldStationName).returning("*");
      
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




app.post("/api/v1/senior/request", async function(req, res) {
  try {
    const {nationalId} = req.body;
    const user = await getUser(req);
  
    // Process the senior request logic logic here

    await db("se_project.senior_requests").insert({
      userid: user.id,
      nationalid: nationalId,
      status: "pending"
    })
   // Return success response
   return res.status(200).send("Senior request processed successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not process senior request");
  }
});



app.delete("/api/v1/route/:routeId", async function(req, res) {
  try {
    const { routeId } = req.params;
    const user = await getUser(req);
    const route = await db("se_project.routes").select("*").where({ id: routeId }).first();

    if (!user.isAdmin) return res.status(401);

    const stationIdfrom = route.fromstationid;
    const stationidto = route.tostationid;

    const fromStation = await db("se_project.stations").select("stationposition").where({ id: stationIdfrom }).first();
    const toStation = await db("se_project.stations").select("stationposition").where({ id: stationidto }).first();

    if (fromStation.stationposition === "start" || toStation.stationposition === "end") {
      await db("se_project.routes")
        .where("id", routeId)
        .delete();

      // Return success response
      return res.status(200).send("Route updated successfully");
    } else {
      return res.status(400).send("Invalid station positions for route deletion");
    }
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not process route update");
  }
});



app.put("/api/v1/route/:routeId", async function(req, res) {
  try {
    const {routeId} = req.params;
    const {routeName} = req.body;
    const user = await getUser(req);
  
    // Process the senior request logic logic here
    const route=await db("se_project.routes")
    .where("id",routeId)
    .update({ "routename":routeName }).returning("*");
    

    // Return success response
    return res.status(200).send("Route updated successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not process route update");
  }
});


//Gerges kan hena ^

//
  //reset password
  //
  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const  newPassword = {
        
        
        password:req.body.newPassword,
      
      };
      const user = await getUser(req);
  
      await db("se_project.users")
        .where("id", user.userid)
        .update(newPassword);

      return res.status(200).send("Password reset successful");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not reset password");
    }
  });

  //helper method
  function generateUniqueId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp}-${random}`;
  }

  //
  // simulate ride
  //
  app.put("/api/v1/ride/simulate", async function (req, res) {
    try {
      const { origin, destination, tripdatee } = req.body;
      const user = await getUser(req);
      console.log("Simulating a ride...");


      const originStation = await db
        .select("*")
        .from("se_project.stations")
        .where("stationname", origin)
        .first();

      const destinationStation = await db
        .select("*")
        .from("se_project.stations")
        .where("stationname", destination)
        .first();

      if (!originStation || !destinationStation) {
        return res.status(400).send("Invalid origin or destination station");
      }

      const ride = {
        status: "simulated",
        origin: originStation.stationname,
        destination: destinationStation.stationname,
        userid: user.id,
        ticketid: 1, // what should i put here?
        tripdate: tripdatee,
      };

      const createdRide = await db("se_project.rides").insert(ride).returning("*");

      return res.status(200).json(createdRide);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not simulate ride");
    }
  });

  //
  //create a new route
  //

  app.post("/api/v1/route", async function (req, res) {
    try {
      const { stationId, connectedStationId, routename } = req.body;
      const user = await getUser(req);
  
      if (!user.isAdmin) {
        return res.status(401).send("Unauthorized");
      }
  
      // Retrieve the newly created station
      const station = await db
        .select("*")
        .from("se_project.stations")
        .where("id", stationId)
        .first();
  
      if (!station) {
        return res.status(404).send("Station not found");
      }
  
      // Check if the position is valid (start or end)
      /* if (station.stationposition !== "start" && station.stationposition !== "end") {
        return res.status(400).send("Invalid position");
      } */
  
      // Create the route
      const newRoute = {
        fromstationid: stationId,
        tostationid: connectedStationId,
        routename,
      };
  
      // Insert the new route into the routes table
      const [createdRoute] = await db("se_project.routes").insert(newRoute).returning(["id", "fromstationid", "tostationid"]);
  
      // Create the stationRoute entry
      const stationRoute = {
        stationid: stationId,
        routeid: createdRoute.id,
      };
  
      // Insert the stationRoute into the stationRoutes table
      await db("se_project.stationroutes").insert(stationRoute);
  
      return res.status(201).send("Route created successfully");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create the route");
    }
  });
    //pay for sub online

    //helper method
    function generateUniqueId() {
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000);
      return `${timestamp}-${random}`;
    }
    app.post("/api/v1/payment/subscription", async function (req, res) {
      const { creditCardNumber, holderName, amount: initialAmount, subType, zoneId } = req.body;
      console.log("PAYMENT INFO ACCEPTED!")
      const generatedPurchasedId = generateUniqueId();
      const user = await getUser(req);
      
      let amount = initialAmount; // Assign the initial amount to a variable that can be modified
      
      if (subType === "yearly") {
        amount *= 10;
      }
      if (zoneId === 2) {
        amount *= 2;
      } else if (zoneId === 3) {
        amount *= 3;
      }
    
      const paymentId = await db("se_project.transactions").insert({
        amount,
        userid: user.id,
        purchasediid: generatedPurchasedId,
        purchasetype: subType,
      }).returning("id");
      const newSubcription ={
        subtype: subType,
        zoneid: zoneId,
        userid: user.id,
        nooftickets: 10,

      }
      await db("se_project.subsription").insert(newSubcription);
    
      return res.status(200).json({ success: true, paymentId });
    });
    
    

  //pay for a ticket
  //
  app.get("/api/v1/tickets", async function (req, res) {
    try {
      const user = await getUser(req);
      const userId = user.id;

      const tickets = await db("se_project.tickets").select("*").where("userid", userId);
      return res.status(200).json(tickets);
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error retrieving tickets");
    }
  });
  
  app.get("/api/v1/stations", async function (req, res) {
    try {
      const stations = await db("se_project.stations")
        .select("stationname")
        .distinct();
  
      return res.status(200).json(stations);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve tickets");
    }
  });
  
  
  app.post("/api/v1/payment/ticket", async function (req, res) {
    try {
      
      const user = await getUser(req);
      const generatedPurchasedId = generateUniqueId();
      const origin = req.body.origin;
      const destination = req.body.destination;
      const tripdatee = req.body.tripdate;
      const rows = await db.select(db.raw('COUNT(*)')).from('se_project.stations');
    
    //convert rows to integer
      const NumberOfStations = parseInt(rows[0].count);
      const Matrix= await generateMatrix(NumberOfStations);
      //console.log(Matrix);
      const SPPMatrix = floydWarshall(Matrix);
      const price=1;
      try{
        const NumberOfPassedStations = SPPM[originId-1][destinationId-1];
        if(NumberOfPassedStations==Infinity){
          console.log("No path exists");
        }
         price = NumberOfPassedStations * 5;
        
      
      
       }
        catch(e){
          console.log(e.message);
          
        }
        
      

    
      

      const ticket = {
        origin: origin,
        destination: destination,
        userid: user.id,
        subid: null,
        tripdate: tripdatee,
      };
      const insertedTicket = await db("se_project.tickets")
        .insert(ticket)
        .returning("*");
  
      const transaction = {
        amount: price,
        userid: user.id,
        purchasediid: generatedPurchasedId,
        purchasetype: "ticket",

      }
      const paymentId = await db("se_project.transactions").insert(transaction).returning("id");
  
      console.log("Payment done...");
  
      return res.status(200).json({
        ticket: insertedTicket,
        transaction: insertedTransaction,
      });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not process the payment");
    }
  });

  


  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get zone data");
    }
  });

  //marco was here
  
  //refund for the user
  app.post("/api/v1/requests/refunds/user/:ticketId", async function (req, res) {
    try {
      const { ticketId } = req.params;
      const user = await getUser(req);
  
      // Check if the user is authorized to request a refund
      if (!user.isNormal) {
        return res.status(401).send("Unauthorized");
      }
  
      // Retrieve the ticket from the database based on the ticketId
      const ticket = await db
        .select("*")
        .from("se_project.tickets")
        .where("id", ticketId)
        .first();
  
      // Check if the ticket exists
      if (!ticket) {
        return res.status(404).send("Ticket not found");
      }
  
      // Create a refund request
      const refundRequest = {
        status: "pending",
        userid: user.id,
        refundamount: 0, // Set the refund amount based on your logic
        ticketid: ticket.id,
      };
  
      // Save the refund request to the database
      const createdRefundRequest = await db("se_project.refund_requests")
        .insert(refundRequest)
        .returning("*");
  
      return res.status(201).json(createdRefundRequest);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not request the refund");
    }
  });

  app.delete("/api/v1/station/:stationId", async function (req, res) {
    try {
      const { stationId } = req.params;
      const user = await getUser(req);
  
      if (!user.isAdmin) {
        return res.status(401).send("Unauthorized");
      }
  
      const station = await db
        .select("*")
        .from("se_project.stations")
        .where("id", stationId)
        .first();
  
      if (!station) {
        return res.status(404).send("Station not found");
      }
  
      const { stationtype } = station;
  
      if (stationtype === "normal") {
        // Delete the routes associated with the station
        await db("se_project.stationroutes")
          .where("stationid", stationId)
          .delete();
  
        // Delete the station from the stations table
        await db("se_project.stations")
          .where("id", stationId)
          .delete();
  
        return res.status(200).send("Station deleted successfully");
      } else {
        return res.status(400).send("Invalid station type");
      }
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not delete the station");
    }
  });

  //sobhy's

  // zozz 

  app.put("/api/v1/zones/:zoneId", async function(req, res) {
    console.log("PUT /api/v1/zones/:zoneId");
    try {
      const user = await getUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }
  
      const zoneId = parseInt(req.params.zoneId);
      const { price } = req.body;
  
      if (!price) {
        return res.status(400).json({ message: "Invalid request" });
      }
  
      const zone = await db("se_project.zones").where("id", zoneId).update({ price }).returning("*");
      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }
  
      return res.status(200).json(zone[0]);
    } catch (error) {
      console.error("Error updating zone:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    
  });

  //subscription
  app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
    try {
      const { subId, origin, destination, tripdatee } = req.body;
  
      // Validate required fields
      if (!subId || !origin || !destination || !tripdatee) {
        return res.status(400).send("Missing required fields");
      }
      

      
      // Perform additional validations and checks
      // Check if the subscription exists
      const subscription = await db
        .select("*")
        .from("se_project.subsription")
        .where("id", subId)
        .first();
  
      if (!subscription) {
        return res.status(404).send("Subscription not found");
      }
  
      // Perform any other necessary validations and checks
      // ...
      const user = await getUser(req);
      const userId = user.id;

          // Check if nooftickets is greater than zero
      if (subscription.nooftickets === 0) {
        return res.status(400).send("No tickets available for this subscription");
      }
      // Create the ticket
      const ticket = {
        subid: subId,
        origin: origin,
        destination: destination,
        tripdate: tripdatee,
        userid: userId,
      };
  
      // Save the ticket to the database
      const createdTicket = await db("se_project.tickets")
        .insert(ticket)
        .returning("*");
      
    await db("se_project.subsription")
    .where("id", subId)
    .where("nooftickets", ">", 0)
    .decrement("nooftickets", 1);
      return res.status(201).json(createdTicket);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not purchase the ticket by subscription");
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

  app.get("/api/v1/tickets/origin", async function (req, res) {
    try {
      const origins = await db.select('id', 'stationname').from('se_project.stations');
      res.status(200).json(origins);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/api/v1/tickets/destination", async function (req, res) {
    try {
      const destinations = await db.select('id', 'stationname').from('se_project.stations');
      res.status(200).json(destinations);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
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