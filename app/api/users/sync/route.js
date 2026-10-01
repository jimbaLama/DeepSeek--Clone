import { auth, currentUser } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress;

    if (!clerkUser || !email) {
      return NextResponse.json(
        { message: "The signed-in Clerk user does not have an email address" },
        { status: 422 },
      );
    }

    const name = clerkUser.fullName || clerkUser.username || email;

    await connectDB();
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          email,
          name,
          image: clerkUser.imageUrl,
        },
      },
      { upsert: true, runValidators: true },
    );

    return NextResponse.json({ message: "User synced" });
  } catch (error) {
    console.error("Failed to sync signed-in user:", error.message);
    return NextResponse.json(
      { message: "Unable to sync user" },
      { status: 500 },
    );
  }
}
