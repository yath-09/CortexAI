
import { prismaClient } from "db";
import express from "express";
const router = express.Router();

import { Webhook } from "svix";

//POSt mthod receving from clerk for dding entries in database
//https://clerk.com/docs/webhooks/sync-data   use this for refrenece 
//will help us to take decision anything in user creation,deletion,updation 

router.post("/api/webhook/clerk", async (req, res) => {
  console.log("recived the request")
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env"
    );
  }

  const wh = new Webhook(SIGNING_SECRET);
  const headers = req.headers;
  const payload = req.body;

  const svix_id = headers["svix-id"];
  const svix_timestamp = headers["svix-timestamp"];
  const svix_signature = headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({
      success: false,
      message: "Error: Missing svix headers",
    });
    return;
  }

  let evt: any;

  try {
    evt = wh.verify(JSON.stringify(payload), {
      "svix-id": svix_id as string,
      "svix-timestamp": svix_timestamp as string,
      "svix-signature": svix_signature as string,
    });
  } catch (err) {
    console.log("Error: Could not verify webhook:", (err as Error).message);
    res.status(400).json({
      success: false,
      message: (err as Error).message,
    });
    return;
  }

  const { id } = evt.data;
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created":
      case "user.updated": {
        await prismaClient.$transaction(async (tx) => {
          const user = await tx.user.upsert({
            where: { userId: id },
            update: {
              name: `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim(),
              email: evt.data.email_addresses[0].email_address,
            },
            create: {
              userId: id,
              name: `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim(),
              email: evt.data.email_addresses[0].email_address,
            },
          });

        });

        console.log("User created/updated")
        break;
      }

      case "user.deleted": {
        await prismaClient.user.delete({
          where: { userId: id },
        });
        console.log("User deleted")
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
        break;
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
    return;
  }

  res.status(200).json({ success: true, message: "Webhook received" });
  return;
});

export default router;