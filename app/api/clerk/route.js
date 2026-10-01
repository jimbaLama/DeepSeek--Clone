import { Webhook } from "svix";
import connectDB from "@/config/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const webhookSecret =
  process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? process.env.SIGNING_SECRET;

export async function POST(request) {
  if (!webhookSecret) {
    console.error("Clerk webhook signing secret is not configured");
    return NextResponse.json(
      { message: "Webhook signing secret is not configured" },
      { status: 500 },
    );
  }

  const headerPayload = await headers();
  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id"),
    "svix-timestamp": headerPayload.get("svix-timestamp"),
    "svix-signature": headerPayload.get("svix-signature"),
  };

  if (Object.values(svixHeaders).some((header) => !header)) {
    return NextResponse.json(
      { message: "Missing Svix webhook headers" },
      { status: 400 },
    );
  }

  let event;
  try {
    // Svix signs the exact request body, not a parsed and re-serialized version.
    event = new Webhook(webhookSecret).verify(await request.text(), svixHeaders);
  } catch (error) {
    console.error("Clerk webhook signature verification failed:", error.message);
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    await connectDB();

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const primaryEmail =
          event.data.email_addresses.find(
            (email) => email.id === event.data.primary_email_address_id,
          )?.email_address ?? event.data.email_addresses[0]?.email_address;

        if (!primaryEmail) {
          console.error("Clerk user event did not include an email address");
          return NextResponse.json(
            { message: "User event is missing an email address" },
            { status: 422 },
          );
        }

        const name =
          [event.data.first_name, event.data.last_name]
            .filter(Boolean)
            .join(" ") ||
          event.data.username ||
          primaryEmail;

        await User.updateOne(
          { _id: event.data.id },
          {
            $set: {
              email: primaryEmail,
              name,
              image: event.data.image_url,
            },
          },
          { upsert: true, runValidators: true },
        );
        break;
      }

      case "user.deleted":
        await User.deleteOne({ _id: event.data.id });
        break;

      default:
        console.log(`Ignoring Clerk webhook event: ${event.type}`);
    }
  } catch (error) {
    console.error("Failed to process Clerk webhook:", error.message);
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Event received" });
}
