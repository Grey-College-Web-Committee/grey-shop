// Get express
const express = require("express");
const router = express.Router();
// The database models
const { User, GymMembership, ToastieOrder, ToastieStock, ToastieOrderContent } = require("../database.models.js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post("/order", async (req, res) => {
  //User only
  const { user } = req.session;
  const { bread, fillings, otherItems } = req.body;

  // Check the bread is actually a bread and is available

  const breadEntry = await ToastieStock.findOne({
    where: {
      id: bread,
      type: "bread"
    }
  });

  if(breadEntry === null) {
    return res.status(400).json({ });
  }

  // breadEntry now has the database entry for this bread
  // Now check the fillings are actually fillings

  const fillingEntries = await ToastieStock.findAll({
    where: {
      id: fillings,
      available: true,
      type: "filling"
    }
  });

  if(fillingEntries.length !== fillings.length) {
    return res.status(400).json({ });
  }

  // fillingEntries now has the database entries for each of the fillings
  // Now check the other items

  const otherEntries = await ToastieStock.findAll({
    where: {
      id: otherItems,
      available: true,
      type: "other"
    }
  });

  if(otherEntries.length !== otherItems.length) {
    return res.status(400).json({ });
  }

  let realCost = Number(breadEntry.price);

  fillingEntries.forEach(item => realCost += Number(item.price));
  otherEntries.forEach(item => realCost += Number(item.price));

  realCost = +realCost.toFixed(2);

  const dbOrder = await ToastieOrder.create({ userId: user.id });

  let confirmedOrder = [
    {
      name: breadEntry.name,
      price: breadEntry.price,
      type: breadEntry.type
    }
  ];

  await ToastieOrderContent.create({ orderId: dbOrder.id, stockId: breadEntry.id });

  fillingEntries.forEach(async (item) => {
    confirmedOrder.push({
      name: item.name,
      price: item.price,
      type: item.type
    });

    await ToastieOrderContent.create({ orderId: dbOrder.id, stockId: item.id });
  });

  otherEntries.forEach(async (item) => {
    confirmedOrder.push({
      name: item.name,
      price: item.price,
      type: item.type
    });

    await ToastieOrderContent.create({ orderId: dbOrder.id, stockId: item.id });
  });

  console.log("Order id", dbOrder.id);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(realCost * 100),
    currency: "gbp",
    metadata: { integration_check: "accept_a_payment" },
    description: "Toastie Bar Order",
    metadata: {
      type: "toastie_bar",
      orderId: dbOrder.id
    },
    receipt_email: user.email
  });

  return res.status(200).json({
    confirmedOrder,
    realCost,
    clientSecret: paymentIntent.client_secret
  });
});

// Get the stock available
router.get("/stock", async (req, res) => {
  // User only
  let stock;

  try {
    stock = await ToastieStock.findAll();
  } catch (error) {
    //handle
    return;
  }

  return res.status(200).json({ stock });
});

// Add a new item for the stock
router.post("/stock", async (req, res) => {
  // Admin only
  const { name, type, price, available } = req.body;

  if(name == null) {
    return res.status(400).json({ error: "Missing name" });
  }

  if(type == null) {
    return res.status(400).json({ error: "Missing type" });
  }

  if(price == null) {
    return res.status(400).json({ error: "Missing price" });
  }

  if(available == null) {
    return res.status(400).json({ error: "Missing available" });
  }

  try {
    await ToastieStock.create({ name, type, price, available });
  } catch (error) {
    //handle
    return;
  }

  return res.status(200).json({});
});

// Update an item in the stock
router.patch("/stock", async (req, res) => {
  // Admin only
});

// Delete an item from the stock
router.delete("/stock", async (req, res) => {
  // Admin only
});

// Set the module export to router so it can be used in server.js
// Allows it to be assigned as a route
module.exports = router;
